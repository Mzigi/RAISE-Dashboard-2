import { BindGroup, BindGroupLayout } from "../../core/material";
import { RenderGraph } from "../../core/renderGraph";
import { RenderPass } from "../../core/renderPass";
import { Shader } from "../../core/shader";
import { Texture } from "../../core/texture";
import { Renderer } from "../../renderer"; 
import { QuadFSShader, QuadVSShader } from "../../shaders/class/quad-shader";

export class DisplayRenderPass extends RenderPass {
    pipeline: GPURenderPipeline;

    vsShader: Shader;
    fsShader: Shader;

    inputTexture: Texture;

    uniformBuffer: GPUBuffer;

    constructor(renderer: Renderer, renderGraph: RenderGraph, name: string, inputTexture: Texture) {
        super(renderer, renderGraph, name);

        if (!renderer.device) throw new Error("Device is missing from Renderer");
        if (!renderer.context) throw new Error("Context is missing from Renderer");
        if (!renderer.presentationFormat) throw new Error("presentationFormat is missing from Renderer");

        this.inputTexture = inputTexture;

        this.colorAttachments = [
            {
                view: renderer.context.getCurrentTexture().createView(), //this should be set later
          
                clearValue: [0.0, 0.0, 1.0, 1.0],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ];

        //uniforms
        this.uniformBuffer = renderer.device.createBuffer({
            label: "Uniform-" + this.label,
            size: 4 * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });

        DisplayRenderPass.bindGroupLayout = new BindGroupLayout(this.renderer, "BasicLightingRenderPass");
        DisplayRenderPass.bindGroupLayout.bindGroupLayoutEntries = [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {}
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            }
        ];

        DisplayRenderPass.bindGroup = new BindGroup(this.renderer, "BasicLightingRenderPass");
        DisplayRenderPass.bindGroup.bindGroupLayout = DisplayRenderPass.bindGroupLayout;
        DisplayRenderPass.bindGroup.bindGroupEntries = [
            {
                binding: 0,
                resource: renderer.device.createSampler({ minFilter: "linear", magFilter: "linear" }),
            },
            {
                binding: 1,
                resource: this.inputTexture.createView(),
            },
            {
                binding: 2,
                resource: { buffer: this.uniformBuffer },
            }
        ];

        this.vsShader = new QuadVSShader(renderer, "QuadVSShader-BasicLighting");
        this.fsShader = new QuadFSShader(renderer, "QuadFSShader-BasicLighting");

        this.pipeline = renderer.device.createRenderPipeline({
            label: "RenderPipeline-" + this.label,
            layout: renderer.device.createPipelineLayout({
                label: "RenderPipelineLayout-" + this.label,
                bindGroupLayouts: [DisplayRenderPass.bindGroupLayout.getBindGroupLayout()]
            }),
            vertex: {
                module: this.vsShader.getShaderModule(),
                entryPoint: "vertexMain",
            },
            fragment: {
                module: this.fsShader.getShaderModule(),
                entryPoint: "fragmentMain",
                targets: [
                    {
                        format: renderer.presentationFormat
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            }
        });
    }
    
    executeVirtualBefore(): void {
        if (!this.renderer.context) throw new Error("Context is missing from Renderer");
        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        this.colorAttachments[0].view = this.renderer.context.getCurrentTexture().createView();

        if (DisplayRenderPass.bindGroup.bindGroupEntries[1].resource !== this.inputTexture.createView()) {
            DisplayRenderPass.bindGroup.bindGroupEntries[1].resource = this.inputTexture.createView();
            DisplayRenderPass.bindGroup.reset();
        }
    }

    executeVirtual(): void {
        if (!this.passEncoder) throw new Error("PassEncoder is missing from BasicLightingRenderPass");
        if (!this.renderer.context) throw new Error("Context is missing from Renderer");
        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        //this.colorAttachments[0].view = this.renderer.context.getCurrentTexture().createView();
        this.renderer.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([this.renderer.canvas.width, this.renderer.canvas.height]));

        this.passEncoder.setPipeline(this.pipeline);
        this.passEncoder.setBindGroup(0, DisplayRenderPass.bindGroup.getBindGroup());
        this.passEncoder.draw(6);
    }
}