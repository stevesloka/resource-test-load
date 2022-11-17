// Copyright 2022, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

import * as ops from "./ops";

// Test for verifying resource changes. Each configuration value (w, x, y, z) is a number
// which influences a set of resources. Changing the configuration will change the dependent
// resources.
//
// If the value is zero or undefined, no resources will be created.

const config = new pulumi.Config();

async function runTest() {
    // x resources just creates groupings of dependent resources.
    const x = config.getNumber("x");
    if (x) {
        for (let i = 0; i < x; i++) {
            let plusTwo = new ops.Add(`${i} + 2`, i, 2);
            let divideThree = new ops.Div(`(${i} + 2) / 3`, plusTwo.sum, 3);
            let result = new ops.Mul(`${i}-result`, divideThree.quotient, divideThree.quotient);
            console.log("log message: ", x)
        }
    }

    // y resources are app dependent on each other, so created sequentially.
    const y = config.getNumber("y");
    if (y) {
        let previous: pulumi.Input<number> | number = 0;
        for (let i = 0; i < y; i++) {
            let newResource: ops.Add = new ops.Add(`y-step-${i}`, previous, y);
            previous = newResource.sum;
            console.log("log message: ", y)
        }
    }

    // z resources are all independent.
    const z = config.getNumber("z");
    if (z) {
        let square = new ops.Mul("z^2", z, z);
        console.log(`z^2 = ${await square.product}`);
    }

    async function delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Create an exact number of resources in the stack.
    if (config.get("exact")) {
        const delayBetweenResources = config.getNumber("delayMs") || 1.0;

        const wantResources = config.requireNumber("exact");
        console.log(`Creating ${wantResources} resources`);
        for (let i = 0; i < wantResources; i++) {
            // Pad with leading 0s up to 4 digits.
            const resID = i.toString().padStart(4, "0");
            const resource = new ops.Add(`exact-resource-${resID}`, i, 0);

            await delay(delayBetweenResources);
        }
    }
};

runTest().then(() => console.log("Done!"));
