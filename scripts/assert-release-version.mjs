#!/usr/bin/env node
// Prints a normalized release version, or exits 1 when it cannot be tagged.

import { readFileSync } from 'node:fs';

const semver =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

const parse = (version) => {
    const match = semver.exec(version);
    if (!match) {
        return null;
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        pre: match[4] ?? ''
    };
};

const comparePre = (left, right) => {
    if (left === right) {
        return 0;
    }
    if (!left) {
        return 1;
    }
    if (!right) {
        return -1;
    }

    const leftParts = left.split('.');
    const rightParts = right.split('.');
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index += 1) {
        const leftPart = leftParts[index];
        const rightPart = rightParts[index];
        if (leftPart === undefined) {
            return -1;
        }
        if (rightPart === undefined) {
            return 1;
        }

        const leftIsNumber = /^[0-9]+$/.test(leftPart);
        const rightIsNumber = /^[0-9]+$/.test(rightPart);
        if (leftIsNumber && rightIsNumber) {
            const diff = Number(leftPart) - Number(rightPart);
            if (diff !== 0) {
                return diff < 0 ? -1 : 1;
            }
        } else if (leftIsNumber) {
            return -1;
        } else if (rightIsNumber) {
            return 1;
        } else if (leftPart !== rightPart) {
            return leftPart < rightPart ? -1 : 1;
        }
    }

    return 0;
};

const compare = (left, right) => {
    const core = (left.major - right.major)
        || (left.minor - right.minor)
        || (left.patch - right.patch);
    if (core !== 0) {
        return core < 0 ? -1 : 1;
    }

    return comparePre(left.pre, right.pre);
};

const versionArg = process.argv[2] ?? '';
const normalized = versionArg.trim().replace(/^v/, '');
const next = parse(normalized);

if (!next) {
    console.error(`Invalid semver "${versionArg}". Use a version like 0.3.0 or 0.3.0-beta.1.`);
    process.exit(1);
}

const packageJsonPath = new URL('../package.json', import.meta.url);
const currentVersion = JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
const current = parse(currentVersion);

if (!current) {
    console.error(`Current package.json version "${currentVersion}" is not valid semver.`);
    process.exit(1);
}

if (compare(next, current) < 0) {
    console.error(`Version ${normalized} is lower than current ${currentVersion}.`);
    process.exit(1);
}

process.stdout.write(`${normalized}\n`);
