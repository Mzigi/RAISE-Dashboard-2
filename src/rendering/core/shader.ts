import { Renderer } from "../renderer";
import { GPUObject } from "./gpuObject";

export enum ShaderType {
    Vertex,
    Fragment,
    Compute,
}

export class Shader extends GPUObject {
    code: string = "";
    shaderModule!: GPUShaderModule;
    shaderType: ShaderType;

    constructor(renderer: Renderer, label: string, shaderType: ShaderType) {
        if (!renderer.device) throw new Error("Device does not exist on renderer");

        super(renderer, shaderType + "Shader-" + label);

        this.shaderType = shaderType;
    }

    init(): void {
        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        this.shaderModule = this.renderer.device.createShaderModule({
            code: this.code,
            label: this.label,
        });
    }

    getShaderModule(): GPUShaderModule {
        return this.shaderModule;
    }
}