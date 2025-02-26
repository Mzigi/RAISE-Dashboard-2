import { GBufferRenderPass } from "../derived/renderPasses/gBuffer-renderPass";
import { Renderer } from "../renderer";
import { GPUObject } from "./gpuObject";
import { UsedVertexAttributes } from "./mesh";
import { RenderPass } from "./renderPass";
import { Shader } from "./shader";

/*

BIND GROUP STRUCTURE

group(0) { //global (or rendergraph?)
    binding(0) var<uniform> camera : Camera {
        viewProjectionMatrix: mat4x4f
        invViewProjectionMatrix: mat4x4f
    }
}
group(1) { //render pass specific
    binding(0) var<uniform> dirLight : DirectionalLight {
        directionalVector: vec3f
    }
}
group(2) { //model specific
    binding(0) var<uniform> model : Model {
        modelMatrix: mat4x4f
        normalModelMatrix: mat4x4f
    }
}
group(3) { //material specific
    binding(0) var time : float {
        time: float
    }
}
*/

export interface BindGroupEntryBase {
    binding: number;
}

export interface BindGroupEntry extends BindGroupEntryBase {
    resource: GPUBindingResource | undefined;
}

export interface BindGroupLayoutEntry extends BindGroupEntryBase {
    visibility: GPUShaderStageFlags,

    buffer?: GPUBufferBindingLayout | undefined;
    texture?: GPUTextureBindingLayout | undefined;
    sampler?: GPUSamplerBindingLayout | undefined;
}

export class BindGroupLayout extends GPUObject {
    bindGroupLayoutEntries: BindGroupLayoutEntry[] = []; //REQUIRED

    private bindGroupLayout: GPUBindGroupLayout | undefined;

    constructor(renderer: Renderer, label: string) {
        super(renderer, "BindGroupLayout-" + label);
    }

    getBindGroupLayoutEntries(): GPUBindGroupLayoutEntry[] {
        if (this.bindGroupLayoutEntries.length === 0) throw new Error("BindGroupLayout is empty");

        const result: GPUBindGroupLayoutEntry[] = [];

        for (const entry of this.bindGroupLayoutEntries) {
            result.push({
                binding: entry.binding,
                visibility: entry.visibility,
                buffer: entry.buffer,
                texture: entry.texture,
                sampler: entry.sampler,
            });
        }

        return result;
    }

    getBindGroupLayout(): GPUBindGroupLayout {
        if (this.bindGroupLayoutEntries.length === 0) throw new Error("BindGroup is empty");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");

        if (!this.bindGroupLayout) {
            const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                label: "BindGroupLayout-" + this.label,
                entries: this.getBindGroupLayoutEntries() as GPUBindGroupLayoutEntry[],
            };

            this.bindGroupLayout = this.renderer.device.createBindGroupLayout(bindGroupLayoutDescriptor);
        }

        return this.bindGroupLayout;
    }

    reset(): void {
        this.bindGroupLayout = undefined;
    }
}

export class BindGroup extends GPUObject {
    bindGroupEntries: BindGroupEntry[] = []; //REQUIRED

    private bindGroup: GPUBindGroup | undefined;
    bindGroupLayout: BindGroupLayout | undefined;

    constructor(renderer: Renderer, label: string) {
        super(renderer, "BindGroup-" + label);
    }

    getBindGroupEntries(): GPUBindGroupEntry[] { //TODO: this should be 2 different functions
        if (this.bindGroupEntries.length === 0) throw new Error("BindGroup is empty");

        const result: GPUBindGroupEntry[] = [];

        for (const entry of this.bindGroupEntries) {
            if (entry.resource) {
                result.push({
                    binding: entry.binding,
                    resource: entry.resource,
                });
            } else {
                throw new Error("BindGroupEntry is missing resource");
            }
        }

        return result;
    }

    getBindGroup(): GPUBindGroup {
        if (this.bindGroupEntries.length === 0) throw new Error("BindGroup is empty");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");
        if (!this.bindGroupLayout) throw new Error(`BindGroup (${this.label}) is missing BindGroupLayout`);

        if (!this.bindGroup) {
            const bindGroupDescriptor: GPUBindGroupDescriptor = {
                label: "BindGroup-" + this.label,
                layout: this.bindGroupLayout.getBindGroupLayout(),
                entries: this.getBindGroupEntries() as GPUBindGroupEntry[],
            };

            this.bindGroup = this.renderer.device.createBindGroup(bindGroupDescriptor);
        }

        return this.bindGroup;
    }

    reset(): void {
        //this.bindGroupLayout = undefined; //should this be done? probably not
        this.bindGroup = undefined;
    }
}

/*export interface BindGroupEntry {
    binding: number;
    resource: GPUBindingResource | undefined;
    visibility: GPUShaderStageFlags;

    buffer?: undefined | GPUBufferBindingLayout;
    texture?: undefined | GPUTextureBindingLayout;
    sampler?: undefined | GPUSamplerBindingLayout;
}

export class BindGroup extends GPUObject {
    bindGroupEntries: BindGroupEntry[] = []; //REQUIRED

    private bindGroup: GPUBindGroup | undefined;
    private bindGroupLayout: GPUBindGroupLayout | undefined;

    getBindGroupLayoutEntries(isLayout: boolean): GPUBindGroupEntry[] | GPUBindGroupLayoutEntry[] { //TODO: this should be 2 different functions
        if (this.bindGroupEntries.length === 0) throw new Error("BindGroup is empty");

        if (isLayout) {
            const result: GPUBindGroupLayoutEntry[] = [];

            for (const entry of this.bindGroupEntries) {
                result.push({
                    binding: entry.binding,
                    visibility: entry.visibility,
                    buffer: entry.buffer,
                    texture: entry.texture,
                    sampler: entry.sampler,
                });
            }

            return result;
        } else {
            const result: GPUBindGroupEntry[] = [];

            for (const entry of this.bindGroupEntries) {
                if (entry.resource) {
                    result.push({
                        binding: entry.binding,
                        resource: entry.resource,
                    });
                } else {
                    throw new Error("BindGroupEntry is missing resource");
                }
            }

            return result;
        }
    }

    getBindGroupLayout(): GPUBindGroupLayout {
        if (this.bindGroupEntries.length === 0) throw new Error("BindGroup is empty");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");

        if (!this.bindGroupLayout) {
            const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
                label: "BindGroupLayout-" + this.label,
                entries: this.getBindGroupLayoutEntries(true) as GPUBindGroupLayoutEntry[],
            };

            this.bindGroupLayout = this.renderer.device.createBindGroupLayout(bindGroupLayoutDescriptor);
        }

        return this.bindGroupLayout;
    }

    getBindGroup(): GPUBindGroup {
        if (this.bindGroupEntries.length === 0) throw new Error("BindGroup is empty");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");

        if (!this.bindGroup) {
            const bindGroupDescriptor: GPUBindGroupDescriptor = {
                label: "BindGroup-" + this.label,
                layout: this.getBindGroupLayout(),
                entries: this.getBindGroupLayoutEntries(false) as GPUBindGroupEntry[],
            };

            this.bindGroup = this.renderer.device.createBindGroup(bindGroupDescriptor);
        }

        return this.bindGroup;
    }

    reset(): void {
        this.bindGroupLayout = undefined;
        this.bindGroup = undefined;
    }
}*/

export class Material {
    renderer: Renderer;
    label: string = "Material";

    defaultBindGroup: BindGroup | undefined; //VIRTUAL (not required)
    bindGroupLayout!: BindGroupLayout; //VIRTUAL
    
    vertexAttributes!: GPUVertexAttribute[]; //VIRTUAL
    vertexAttributesStride!: number; //VIRTUAL
    usedVertexAttributes!: UsedVertexAttributes; //VIRTUAL

    private pipeline: GPURenderPipeline | undefined;
    private pipelineLayout: GPUPipelineLayout | undefined;

    vsShader!: Shader; //VIRTUAL
    fsShader: Shader | undefined; //VIRTUAL (not required)

    created: boolean = false;

    primitiveCullMode: GPUCullMode = "back";

    private static instance: Material;

    constructor(renderer: Renderer) {
        if (this.static.instance) {
            throw new Error(`Material (${this.getId()}) already exists`);
        }

        this.renderer = renderer;

        this.beforeInit();
        this.init();
        this.afterInit();

        this.static.instance = this;
        renderer.addMaterial(this.getId(), this);
    }

    get static(): typeof Material {
        return (<typeof Material><unknown>this.constructor);
    }

    beforeInit(): void {} //making sure all virtual properties are set

    init(): void { //validating virtual properties
        if (!this.bindGroupLayout || !this.vertexAttributes || !this.vertexAttributesStride || !this.usedVertexAttributes || !this.vsShader || this.label === "Material") {
            console.log(this);
        }
        if (!this.bindGroupLayout) throw new Error("Material is missing bindGroupLayout");
        if (!this.vertexAttributes) throw new Error("Material is missing vertexAttributes");
        if (!this.vertexAttributesStride) throw new Error("Material is missing vertexAttributesStride");
        if (!this.usedVertexAttributes) throw new Error("Material is missing usedVertexAttributes");
        if (!this.vsShader) throw new Error("Material is missing vsShader");
        if (this.label === "Material") throw new Error("Material is missing label");

        //check if virtual functions are set up
        this.getTargetInfos();

        this.created = true;
    }

    afterInit(): void {} //setting default bind group

    /*setBindGroups(renderPass: RenderPass): void {
        if (!this.created) throw new Error("Material hasn't been initialized");
        if (!renderPass.passEncoder) throw new Error("PassEncoder is missing from RenderPass");

        renderPass.passEncoder.setBindGroup(3, this.bindGroup.getBindGroup());
    }*/

    getVertexBufferLayout(): GPUVertexBufferLayout {
        if (!this.created) throw new Error("Material hasn't been initialized");

        return {
            arrayStride: this.vertexAttributesStride,
            attributes: this.vertexAttributes,
        };
    }

    getPipelineLayout(): GPUPipelineLayout {
        if (!this.created) throw new Error("Material hasn't been initialized");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");
        if (!this.renderer.renderGraph) throw new Error("Renderer is missing currentRenderGraph");

        if (!this.pipelineLayout) {
            const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = {
                label: "PipelineLayout-" + this.label,
                bindGroupLayouts: [this.renderer.renderGraph.bindGroupLayout.getBindGroupLayout(), GBufferRenderPass.bindGroupLayout.getBindGroupLayout(), this.renderer.modelBindGroupLayout.getBindGroupLayout(), this.bindGroupLayout.getBindGroupLayout()],
            };

            this.pipelineLayout = this.renderer.device.createPipelineLayout(pipelineLayoutDescriptor);
        }

        return this.pipelineLayout;
    }

    getTargetInfos(): GPUColorTargetState[] {
        throw new Error("Virtual method called");
    }

    getPipeline(): GPURenderPipeline {
        if (!this.created) throw new Error("Material hasn't been initialized");
        if (!this.renderer.device) throw new Error("Renderer is missing Device");

        if (!this.pipeline) {
            let fragment: GPUFragmentState | undefined = undefined;
            if (this.fsShader) {
                fragment = {
                    module: this.fsShader.getShaderModule(),
                    targets: this.getTargetInfos(),
                    entryPoint: "fragmentMain",
                };
            }

            const pipelineDescriptor: GPURenderPipelineDescriptor = {
                label: "Pipeline-" + this.label,
                layout: this.getPipelineLayout(),
                vertex: {
                    module: this.vsShader.getShaderModule(),
                    buffers: [this.getVertexBufferLayout()],
                    entryPoint: "vertexMain",
                },
                fragment: fragment,
                depthStencil: { //TODO: fix this (that includes primitive)
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus',
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: this.primitiveCullMode,
                },
            };

            this.pipeline = this.renderer.device.createRenderPipeline(pipelineDescriptor);
        }

        return this.pipeline;
    }

    getId(): string {
        return this.label;
    }

    static get(renderer: Renderer): Material {
        if (!this.instance) {
            new this(renderer);
        }

        return this.instance;
    }
}

export class MaterialView {
    material: Material;
    bindGroup?: BindGroup;

    constructor(material: Material, bindGroup?: BindGroup) {
        this.material = material;
        this.bindGroup = bindGroup;
    }

    getBindGroupToUse(): BindGroup | undefined {
        return this.bindGroup || this.material.defaultBindGroup;
    }

    isReady(): boolean {
        return !!this.getBindGroupToUse() && this.material.created;
    }

    setBindGroups(renderPass: RenderPass): void {
        const bindGroupToUse: BindGroup | undefined = this.getBindGroupToUse();

        if (!bindGroupToUse) throw new Error("MaterialView has no valid BindGroup, MaterialView.isReady() should be checked before calling setBindGroups(RenderPass)");
        if (!renderPass.passEncoder) throw new Error("PassEncoder is missing from RenderPass");

        renderPass.passEncoder.setBindGroup(3, bindGroupToUse.getBindGroup());
    }
}