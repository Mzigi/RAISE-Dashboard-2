/*
Based on:
    https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
    https://github.com/KhronosGroup/glTF-Tutorials/blob/main/gltfTutorial/README.md
*/
/*

import { ModelGroup } from "./model";

export class GLTFAsset {
    copyright: string | undefined;
    generator: string | undefined;
    minVersion: string | undefined;

    extensions: object | undefined;
    extras: object | undefined;

    //required
    version: string;

    constructor(version: string) {
        this.version = version;
    }
}

export class GLTFBuffer {
    name: string | undefined;
    uri: string | undefined;

    //required
    byteLength: number;

    constructor(byteLength: number) {
        this.byteLength = byteLength;
    }
}

export class GLTFBufferView {
    name: string | undefined;

    byteOffset: number | undefined;
    byteStride: number | undefined;

    //required
    buffer: GLTFBuffer;
    byteLength: number;

    constructor(buffer: GLTFBuffer, byteLength: number) {
        this.buffer = buffer;
        this.byteLength = byteLength;
    }
}

export enum GLTFAccessorComponentType {
    FLOAT = 5126,
    UNSIGNED_SHORT = 5123,
}

export type GLTFAccessorType = "VEC4" | "VEC3" | "VEC2" | "SCALAR"

export class GLTFAccessor {
    name: string | undefined;

    bufferView: GLTFBufferView | undefined;
    byteOffset: number | undefined;

    max: number[] | undefined;
    min: number[] | undefined;

    //required
    componentType: GLTFAccessorComponentType;
    count: number;
    type: GLTFAccessorType;

    constructor(
        componentType: GLTFAccessorComponentType,
        count: number,
        type: GLTFAccessorType,
    ) {
        this.componentType = componentType;
        this.count = count;
        this.type = type;
    }
}

export class GLTFTextureInfo {
    index: GLTFTexture;
    texCoord: number = 0;
}

export class GLTFPBRMetallicRoughness {
    baseColorFactor: [number, number, number, number] | undefined;
    baseColorTexture: GLTFTextureInfo | undefined;
    metallicFactor: number = 1;
    roughnessFactor: number = 1;
    metallicRoughnessTexture: GLTFTextureInfo | undefined;
}

export class GLTFMaterial {
    name: string | undefined;

    pbrMetallicRoughness: GLTFPBRMetallicRoughness | undefined;
    normalTexture: GLTFNormalTextureInfo | undefined;
    occlusionTexture: GLTFOcclusionTextureInfo | undefined;
}

export class GLTFMeshPrimitive {
    attributes: Map<string, GLTFAccessor>;

    indices: GLTFAccessor | undefined;
    material: GLTFMaterial | undefined;

    constructor(attributes: Map<string, GLTFAccessor>) {
        this.attributes = attributes;
    }
}

export class GLTFMesh {
    name: string | undefined;

    //required
    primitives: GLTFMeshPrimitive[];

    constructor(primitives: GLTFMeshPrimitive[]) {
        this.primitives = primitives;
    }
}

export class GLTFNode { //TODO: fully implement
    name: string | undefined;
    mesh: GLTFMesh | undefined;
}

export class GLTFScene {
    nodes: GLTFNode[] | undefined;
    name: string | undefined;

    extensions: object | undefined;
    extras: object | undefined;
}

export class GLTFData {
    scene: number | undefined;


    //required
    asset: GLTFAsset;

    constructor(asset: GLTFAsset) {
        this.asset = asset;
    }
}

export class GLTFModelGroup extends ModelGroup {
    rawGltfData: object | undefined;
    gltfData: GLTFData | undefined;
}

*/