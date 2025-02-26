import { Model } from "./core/model";
import { RenderGraph } from "./core/renderGraph";
import { Texture } from "./core/texture";
import { BindGroupLayout, Material } from "./core/material";
import { Light, LightType } from "./core/light";

export class Renderer {
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext | null | undefined;
    presentationFormat: GPUTextureFormat | undefined;
    aspect: number = 1;

    adapter: GPUAdapter | null | undefined;
    device: GPUDevice | undefined;

    commandEncoder: GPUCommandEncoder | undefined;

    //modelUniformBuffer!: GPUBuffer;
    modelBindGroupLayout!: BindGroupLayout;

    renderGraph: RenderGraph | undefined;

    private textures: Map<string, Texture> = new Map();
    private models: Model[] = [];
    private materials: Map<string, Material> = new Map();
    private lights: Light[] = [];

    success: true | false | undefined = undefined;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async init(): Promise<void> {
        this.context = this.canvas.getContext("webgpu");

        this.adapter = await navigator.gpu?.requestAdapter();
        this.device = await this.adapter?.requestDevice();

        this.success = (!!this.adapter && !!this.device && !!this.context);

        if (!this.success || !this.device) return;

        this.device.addEventListener("uncapturedevent", () => {
            throw new Error("oh no! uncaptured event!!");
        });

        this.configureCanvas();

        this.modelBindGroupLayout = new BindGroupLayout(this, "ModelBindGroup");
        this.modelBindGroupLayout.bindGroupLayoutEntries = [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                }
            }
        ];
    }

    configureCanvas(): void {
        if (!this.context) throw new Error ("Renderer is missing context");

        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device as GPUDevice,
            format: this.presentationFormat,
        });
        this.resizeCanvas();
    }

    resizeCanvas(): void {
        if (this.canvas.width === this.canvas.clientWidth && this.canvas.height === this.canvas.clientHeight) return;

        this.canvas.width = this.canvas.clientWidth; //TODO: * devicePixelRatio
        this.canvas.height = this.canvas.clientHeight;
        this.aspect = this.canvas.width / this.canvas.height;

        //update texture that are the size of the canvas
        for (const [, texture] of this.textures) {
            if (texture.matchCanvas) {
                texture.create();
            }
        }
    }
    
    addModel(model: Model): number {
        model.id = this.models.length;
        this.models.push(model);

        return model.id;
    }

    removeModel(model: Model): void {
        if (model.id !== undefined) {
            this.models[model.id] = this.models[this.models.length - 1];
            this.models[model.id].id = model.id;
            this.models.pop();
        }
    }

    addLight(light: Light): number {
        light.id = this.lights.length;
        this.lights.push(light);

        return light.id;
    }

    getLights(lightType: LightType = LightType.Virtual): Light[] {
        if (lightType === LightType.Virtual) {
            return this.lights;
        }

        const result: Light[] = [];

        for (const light of this.lights) {
            if (light.static.lightType === lightType) {
                result.push(light);
            }
        }

        return result;
    }

    removeLight(light: Light): void {
        if (light.id !== undefined) {
            this.lights[light.id] = this.lights[this.lights.length - 1];
            this.lights[light.id].id = light.id;
            this.lights.pop();
        }
    }

    getModels(): Model[] {
        return this.models;
    }

    addTexture(texture: Texture): void {
        if (!this.textures.get(texture.label)) {
            this.textures.set(texture.label, texture);
        } else {
            throw new Error(`Texture with name "${texture.label}" aleady exists`);
        }
    }

    getTexture(textureName: string): Texture | undefined {
        return this.textures.get("Texture-" + textureName);
    }

    addMaterial(materialId: string, material: Material): void {
        if (!this.materials.get(materialId)) {
            this.materials.set(materialId, material);
        } else {
            throw new Error(`Material with id "${materialId}" already exists`);
        }
    }

    render(): void {
        if (!this.renderGraph) throw new Error("Renderer is missing RenderGraph");
        if (!this.device) throw new Error("Renderer is missing Device");

        this.resizeCanvas();

        this.commandEncoder = this.device.createCommandEncoder({
            "label": "Renderer.commandEncoder"
        });

        this.renderGraph.execute();

        this.device.queue.submit([this.commandEncoder.finish()]);
    }
}