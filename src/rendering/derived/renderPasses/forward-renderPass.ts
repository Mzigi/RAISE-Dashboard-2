import { BindGroup, BindGroupLayout } from "../../core/material";
import { RenderGraph } from "../../core/renderGraph";
import { RenderPass } from "../../core/renderPass";
import { Texture } from "../../core/texture";
import { Renderer } from "../../renderer";
import { DefaultRenderGraph } from "../renderGraphs/default-renderGraph";
import { GBufferRenderPass } from "./gBuffer-renderPass";

export class ForwardRenderPass extends RenderPass {
    gBufferPass: GBufferRenderPass;

    targetTexture: Texture;
    depthTexture: Texture;

    constructor(renderer: Renderer, renderGraph: RenderGraph, name: string, gBufferPass: GBufferRenderPass) {
        super(renderer, renderGraph, name);

        if (!renderer.device) throw new Error("Device is missing from Renderer");

        this.gBufferPass = gBufferPass;

        this.depthTexture = new Texture(renderer,
            "ForwardRenderPass-depthTexture",
            [1,1,1],
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            "depth24plus",
            true,
        );

        this.targetTexture = (this.renderGraph as DefaultRenderGraph).basicLightingPass.targetTexture;
        
        this.colorAttachments = [
            {
                view: this.targetTexture.createView(), //this should be set later
          
                loadOp: 'load',
                storeOp: 'store',
            },
        ];

        if (!this.gBufferPass.depthStencilAttachment) throw new Error("GBufferPass is missing depthStencilAttachment");

        this.depthStencilAttachment = {
            view: this.gBufferPass.depthStencilAttachment.view,
        
            depthLoadOp: "load",
            depthStoreOp: 'store',
        };

        // Forwar

        //uniforms
        ForwardRenderPass.uniformBuffer = renderer.device.createBuffer({
            size:  1,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        ForwardRenderPass.bindGroupLayout = new BindGroupLayout(this.renderer, "ForwardRenderPass");
        ForwardRenderPass.bindGroupLayout.bindGroupLayoutEntries = [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                }
            }
        ];

        ForwardRenderPass.bindGroup = new BindGroup(this.renderer, "ForwardRenderPass");
        ForwardRenderPass.bindGroup.bindGroupLayout = ForwardRenderPass.bindGroupLayout;
        ForwardRenderPass.bindGroup.bindGroupEntries = [
            {
                binding: 0,
                resource: {
                    buffer: ForwardRenderPass.uniformBuffer,
                },
            }
        ];
    }

    executeVirtualBefore(): void {
        if (!this.gBufferPass.depthStencilAttachment) throw new Error("GBufferPass is missing depthStencilAttachment");

        this.colorAttachments = [
            {
                view: this.targetTexture.createView(), //this should be set later
          
                loadOp: 'load',
                storeOp: 'store',
            },
        ];
        this.depthStencilAttachment = {
            view: this.gBufferPass.depthStencilAttachment.view,
        
            depthClearValue: 1.0,
            depthLoadOp: "load",
            depthStoreOp: 'store',
        };

    }

    executeVirtual(): void {
        if (!this.passEncoder) throw new Error("PassEncoder is missing from ForwardRenderPass");

        /*for (const model of this.renderer.getModels()) {
            model.prepareRender();
        }*/

        for (const model of this.renderer.getModels()) {
            model.render(this, "forwardMat");
        }
    }
}