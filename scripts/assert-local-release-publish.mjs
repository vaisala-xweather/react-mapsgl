#!/usr/bin/env node
// npm publish is allowed only from a clean local main whose package.json version is the release tag.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fail = (message) => {
    console.error(message);
    process.exit(1);
};

if (process.env.GITHUB_ACTIONS === 'true' || process.env.CI) {
    fail('npm publish runs only on a local machine from main. Do not publish from CI.');
}

const root = fileURLToPath(new URL('..', import.meta.url));
const git = (command) => execSync(command, { cwd: root, encoding: 'utf8' }).trim();

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const expectedTag = `v${version}`;

let branch = '';
try {
    branch = git('git symbolic-ref --short HEAD');
} catch {
    fail('npm publish must be run from main.');
}

if (branch !== 'main') {
    fail(`npm publish must be run from main. Current branch is ${branch}.`);
}

try {
    git('git diff-index --quiet HEAD --');
} catch {
    fail('Commit or stash changes before publishing. main must match the tagged release.');
}

try {
    git(`git fetch origin refs/heads/main:refs/remotes/origin/main refs/tags/${expectedTag}:refs/tags/${expectedTag}`);
} catch {
    fail(`Could not fetch main and ${expectedTag}. Run the Release workflow for ${version}, then pull main.`);
}

const head = git('git rev-parse HEAD');
const originMain = git('git rev-parse origin/main');
if (head !== originMain) {
    fail(`Local main does not match origin/main. Pull before publishing ${version}.`);
}

let tagCommit = '';
try {
    tagCommit = git(`git rev-parse ${expectedTag}^{}`);
} catch {
    fail(`Tag ${expectedTag} does not exist. Run the Release workflow for ${version} first.`);
}

if (tagCommit !== originMain) {
    fail(`package.json on main is ${version}, but ${expectedTag} does not point at origin/main.`);
}

const distTag = process.env.npm_config_tag || 'latest';
if (version.includes('-') && distTag === 'latest') {
    fail(`Prerelease ${version} cannot be published to latest. Use npm publish --tag beta or --tag next.`);
}
