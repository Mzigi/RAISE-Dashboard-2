import { Renderer } from "../renderer";
import { Camera } from "./camera";
import { BindGroup, BindGroupLayout } from "./material";
import { RenderPass } from "./renderPass";

type RenderPassMap = Map<string, RenderPass>

export class RenderGraph { //VIRTUAL CLASS
    renderer: Renderer;

    camera: Camera | undefined;

    renderPasses: RenderPassMap = new Map();

    bindGroup!: BindGroup; //VIRTUAL
    bindGroupLayout!: BindGroupLayout; //VIRTUAL
    uniformBuffer!: GPUBuffer; //VIRTUAL

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    execute(): void {
        throw new Error("Virtual method called!");
    }
}