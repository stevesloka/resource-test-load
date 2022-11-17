// Copyright 2022, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

/**
 * Resources for representing basic arithmatic operations.
 */

export class OperatorProvider implements dynamic.ResourceProvider {
    private op: (l: number, r: number) => any;

    public check?: (olds: any, news: any) => Promise<dynamic.CheckResult>;
    public diff?: (id: pulumi.ID, olds: any, news: any) => Promise<dynamic.DiffResult>;
    public create: (inputs: any) => Promise<dynamic.CreateResult>;
    public read?: (id: pulumi.ID, props?: any) => Promise<dynamic.ReadResult>;
    public update?: (id: pulumi.ID, olds: any, news: any) => Promise<dynamic.UpdateResult>;
    public delete?: (id: pulumi.ID, props: any) => Promise<void>;

    constructor(op: (l: number, r: number) => any) {
        this.op = op;
        const __this = this;
        this.check = (olds: any, news: any) => Promise.resolve({ inputs: news });
        this.diff = (id: pulumi.ID, olds: any, news: any) => Promise.resolve({});
        this.delete = (id: pulumi.ID, props: any) => Promise.resolve();
        this.create = (inputs: any) => Promise.resolve({ id: "0", outs: __this.op(Number(inputs.left), Number(inputs.right)) });
        this.read = (id: pulumi.ID, props?: any) => Promise.resolve({ props: props });
        this.update = (id: string, olds: any, news: any) => Promise.resolve({ outs: __this.op(Number(news.left), Number(news.right)) });
    }
}

export class DivProvider extends OperatorProvider {
    constructor() {
        super((left: number, right: number) => <any>{ quotient: Math.floor(left / right), remainder: left % right });
    }

    check = (olds: any, news: any) => Promise.resolve({
        inputs: news,
        failures: news.right == 0 ? [{ property: "right", reason: "divisor must be non-zero" }] : [],
    });
}

export class Add extends dynamic.Resource {
    public readonly sum: pulumi.Output<number>;

    private static provider = new OperatorProvider((left: number, right: number) => <any>{ sum: left + right });

    constructor(name: string, left: pulumi.Input<number>, right: pulumi.Input<number>) {
        super(Add.provider, name, { left: left, right: right, sum: undefined }, undefined);
    }
}

export class Mul extends dynamic.Resource {
    public readonly product: pulumi.Output<number>;

    private static provider = new OperatorProvider((left: number, right: number) => <any>{ product: left * right });

    constructor(name: string, left: pulumi.Input<number>, right: pulumi.Input<number>) {
        super(Mul.provider, name, { left: left, right: right, product: undefined }, undefined);
    }
}

export class Sub extends dynamic.Resource {
    public readonly difference: pulumi.Output<number>;

    private static provider = new OperatorProvider((left: number, right: number) => <any>{ difference: left - right });

    constructor(name: string, left: pulumi.Input<number>, right: pulumi.Input<number>) {
        super(Sub.provider, name, { left: left, right: right, difference: undefined }, undefined);
    }
}

export class Div extends dynamic.Resource {
    public readonly quotient: pulumi.Output<number>;
    public readonly remainder: pulumi.Output<number>;

    private static provider = new DivProvider();

    constructor(name: string, left: pulumi.Input<number>, right: pulumi.Input<number>) {
        super(Div.provider, name, { left: left, right: right, quotient: undefined, remainder: undefined }, undefined);
    }
}

// All this component resource does is register some pulumi.Resource objects as its outputs. But in
// doing so will create a "resource reference" within the checkpoint file.
export class CreateResRefComponent extends pulumi.ComponentResource {
    constructor(
        name: string, args: { resourcesToReference: pulumi.Resource[] }, opts?: pulumi.ComponentResourceOptions) {
        super("pulumi-service:testing:CreateResRefComponent", name, opts);
        this.initialize(args);
        this.registerOutputs({
            inputArgs: args,
        });
    }
}
