import { Renderer } from "../renderer";
import { BindGroup, MaterialView } from "./material";
import { Mesh } from "./mesh";
import { RenderPass } from "./renderPass";
import { mat4 } from "wgpu-matrix";

export type MaterialName = "gBufferMat" | "shadowMat" | "forwardMat"; 

/* DEPRECATED
export class BufferData {
    data: Float32Array;

    constructor(data: Float32Array) {
        this.data = data;
    }

    getSize(): number {
        return this.data.byteLength;
    }
}

export class VertexBufferData extends BufferData {

}

export class IndexBufferData extends BufferData {
    indexCount: number;
    
    constructor(data: Float32Array, indexCount: number) {
        super(data);

        this.indexCount = indexCount;
    }
}
*/

export class Vector2 {
    x: number = 0;
    y: number = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    toArray2(): [number, number] {
        return [this.x, this.y];
    }

    magnitude(): number {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    minus(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
}

export class Vector3 extends Vector2 {
    z: number = 0;

    constructor(x: number, y?: number, z?: number) {
        if (y != null && z != null) {
            super(x, y);
            this.z = z;
        } else if (y != null) {
            super(x,y);
        } else {
            super(x,x);
            this.z = x;
        }
    }

    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    toArray(): [number, number, number] {
        return [this.x, this.y, this.z];
    }

    magnitude(): number {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    }

    add(other: Vector3): Vector3 {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    minus(other: Vector3): Vector3 {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    multiply(other: Vector3): Vector3 {
        return new Vector3(this.x * other.x, this.y * other.y, this.z * other.z);
    }

    divide(other: Vector3): Vector3 {
        return new Vector3(this.x / other.x, this.y / other.y, this.z / other.z);
    }

    get r(): number {
        return this.x;
    }

    get g(): number {
        return this.y;
    }

    get b(): number {
        return this.z;
    }

    set r(val: number) {
        this.x = val;
    }

    set g(val: number) {
        this.y = val;
    }

    set b(val: number) {
        this.z = val;
    }
}

/*
struct Model {
    modelMatrix: mat4x4,
    normalModelMatrix: mat4x4,
}
*/

export class ModelGroup {
    position: Vector3 = new Vector3(0,0,0);
    size: Vector3 = new Vector3(1,1,1);
    rotation: Vector3 = new Vector3(0,0,0);

    models: Model[] = [];
}

export class Model {
    gBufferMat: MaterialView | undefined;
    shadowMat: MaterialView | undefined;
    forwardMat: MaterialView | undefined;

    renderer: Renderer;

    label: string;

    mesh: Mesh;

    private modelUniformBuffer: GPUBuffer;
    private modelBindGroup: BindGroup;

    private vertexBuffer: GPUBuffer | undefined;
    private indexBuffer: GPUBuffer | undefined;

    id: number | undefined; //index in renderer's model array

    position: Vector3 = new Vector3(0,0,0);
    size: Vector3 = new Vector3(1,1,1);
    rotation: Vector3 = new Vector3(0,0,0);

    modelGroup: ModelGroup | undefined;

    constructor(renderer: Renderer, mesh: Mesh, label: string = "Unknown") {
        this.renderer = renderer;
        this.mesh = mesh;
        this.label = "Model-" + label;

        this.getVertexBuffer();

        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        this.modelUniformBuffer = this.renderer.device.createBuffer({
            label: "ModelUniformBuffer-" + this.label,
            size: 4 * 16 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.modelBindGroup = new BindGroup(this.renderer, this.label);
        this.modelBindGroup.bindGroupLayout = renderer.modelBindGroupLayout;
        this.modelBindGroup.bindGroupEntries = [
            {
                binding: 0,
                resource: {buffer: this.modelUniformBuffer},
            }
        ];
    }

    remove(): void {
        if (this.id !== undefined) {
            this.renderer.removeModel(this);
        }
    }

    prepareRender(): void {
        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        //model uniform
        const modelMatrix: Float32Array = mat4.translation([this.position.x, this.position.y, this.position.z]);
        mat4.scale(modelMatrix, [this.size.x, this.size.y, this.size.z], modelMatrix);
        mat4.rotateY(modelMatrix, this.rotation.y * Math.PI / 180, modelMatrix);
        mat4.rotateX(modelMatrix, this.rotation.x * Math.PI / 180, modelMatrix);
        mat4.rotateZ(modelMatrix, this.rotation.z * Math.PI / 180, modelMatrix);
        this.renderer.device.queue.writeBuffer(this.modelUniformBuffer, 0, modelMatrix);

        const invertTransposeModelMatrix: Float32Array = mat4.invert(modelMatrix);
        mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
        this.renderer.device.queue.writeBuffer(
            this.modelUniformBuffer,
            4 * 16,
            invertTransposeModelMatrix.buffer,
            invertTransposeModelMatrix.byteOffset,
            invertTransposeModelMatrix.byteLength
        );
    }

    render(renderPass: RenderPass, materialName: MaterialName): void {
        if (!this.renderer.device) throw new Error("Device is missing from Renderer");
        if (!renderPass.passEncoder) throw new Error("PassEncoder is missing from RenderPass");
        if (!this.renderer.renderGraph) throw new Error("currentRenderGraph is missing from RenderPass");

        const materialView: MaterialView | undefined = this[materialName];

        if (materialView && materialView.isReady()) {
            if (!this.mesh.getUsedAttributes().matches(materialView.material.usedVertexAttributes)) {
                throw new Error(`Mesh (${this.label}) does not have the vertex attributes that match the ones Material (${materialView.material.getId()}) needs`);
            }

            //configure passEncoder
            renderPass.passEncoder.setPipeline(materialView.material.getPipeline());

            /*
            renderPass.passEncoder.setBindGroup(0, this.renderer.renderGraph.bindGroup.getBindGroup());
            renderPass.passEncoder.setBindGroup(1, renderPass.static.bindGroup.getBindGroup());
            */

            renderPass.passEncoder.setBindGroup(2, this.modelBindGroup.getBindGroup());
            materialView.setBindGroups(renderPass);

            renderPass.passEncoder.setVertexBuffer(0, this.getVertexBuffer());
            renderPass.passEncoder.setIndexBuffer(this.getIndexBuffer(), "uint16");

            renderPass.passEncoder.drawIndexed(this.mesh.getIndexCount());

            //window.app.shouldClose = true;
        } else {
            //console.warn(material);
            //console.log(`Material (${material?.label}) hasn't been created yet`);
        }
    }

    getVertexBuffer(): GPUBuffer {
        if (!this.renderer.device) throw new Error("Renderer is missing device");
        
        if (!this.vertexBuffer) {
            this.vertexBuffer = this.renderer.device.createBuffer({
                label: "VertexBuffer-" + this.label,
                size: this.mesh.getVertexBufferData().byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true,
            });
            const vertexBufferData: Float32Array = this.mesh.getVertexBufferData();
            new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexBufferData);
            this.vertexBuffer.unmap();
        }
        
        return this.vertexBuffer;
    }

    getIndexBuffer(): GPUBuffer {
        if (!this.renderer.device) throw new Error("Renderer is missing device");
        if (!this.indexBuffer) {
            this.indexBuffer = this.renderer.device.createBuffer({
                label: "IndexBuffer-" + this.label,
                size: this.mesh.getIndexBufferData().byteLength,
                usage: GPUBufferUsage.INDEX,
                mappedAtCreation: true,
            });
            const indexBufferData: Uint16Array = this.mesh.getIndexBufferData();
            new Uint16Array(this.indexBuffer.getMappedRange()).set(indexBufferData);
            this.indexBuffer.unmap();
        }

        return this.indexBuffer;
    }
}