import React, { useContext, useEffect, useState } from 'react';
import * as mapsgl from '@xweather/mapsgl';
import { MapControllerContext } from './Context';
import { AnyMapController } from './MapController';

export interface LegendControlOptions {
    metric?: boolean;
    width?: number;
    insets?: number | [number, number, number, number];
    toggleOnClick?: boolean;
}

const LegendControl = ({
    metric,
    width = 300,
    insets,
    toggleOnClick = true
}: LegendControlOptions) => {
    const [control, setControl] = useState<mapsgl.LegendControl>(); // eslint-disable-line no-unused-vars
    const controller = useContext<AnyMapController>(MapControllerContext);

    if (!controller.container) return <></>;

    useEffect(() => {
        // MapsGL 1.10+ dropped absolute positioning from `.awxgl-control-legend`, so host
        // the control in a positioned wrapper. Also omit undefined options — passing
        // `insets: undefined` overwrites MapsGL defaults and yields NaN canvas heights.
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '50';
        controller.container.append(container);

        const options: Partial<mapsgl.LegendControlOptions> = {
            width,
            toggleOnClick
        };

        if (insets !== undefined) {
            options.insets = insets;
        }

        if (metric !== undefined) {
            options.system = metric ? 'metric' : 'imperial';
        }

        const el = controller.addLegendControl(container, options);
        setControl(el!);
        return () => {
            controller.removeLegendControl();
            container.remove();
        };
    }, []);

    return <></>;
};

export default LegendControl;
