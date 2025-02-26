export class UsedVertexAttributes {
    usesPositions: boolean = false;
    usesNormals: boolean = false;
    usesUvs: boolean = false;

    matches(otherAttributes: UsedVertexAttributes): boolean {
        return this.usesPositions === otherAttributes.usesPositions &&
                this.usesNormals === otherAttributes.usesNormals &&
                this.usesUvs === otherAttributes.usesUvs;
    }

    contains(otherAttributes: UsedVertexAttributes): boolean {
        return (this.usesPositions || this.usesPositions === otherAttributes.usesPositions) && 
                (this.usesNormals || this.usesNormals === otherAttributes.usesNormals) &&
                (this.usesUvs || this.usesUvs === otherAttributes.usesUvs);
    }
}

export class Mesh {
    positions: Array<[number, number, number]> = [];
    normals: Array<[number, number, number]> = [];
    uvs: Array<[number, number]> = [];

    triangles: Array<[number, number, number]> = [];

    private vertexBufferData: Float32Array | undefined;
    private indexBufferData: Uint16Array | undefined;

    //get arrays
    getPositions(): Array<[number, number, number]> {
        return this.positions;
    }

    getNormals(): Array<[number, number, number]> {
        return this.normals;
    }

    getUvs(): Array<[number, number]> {
        return this.uvs;
    }

    //get count
    getVertexCount(): number {
        return this.positions.length;
    }

    getIndexCount(): number {
        return this.triangles.length * 3;
    }

    //get buffers
    getVertexBufferData(): Float32Array {
        if (!this.vertexBufferData) {
            if (this.getVertexCount() === 0) {
                console.warn(`Mesh has no vertices`);
            }

            this.vertexBufferData = new Float32Array(this.positions.length * 3 + this.normals.length * 3 + this.uvs.length * 2);

            const usedAttributes: UsedVertexAttributes = this.getUsedAttributes();

            let offset: number = 0;

            for (let i: number = 0; i < this.getVertexCount(); i++) {
                if (usedAttributes.usesPositions) {
                    this.vertexBufferData.set(this.getPositions()[i], offset);
                    offset += 3;
                }

                if (usedAttributes.usesNormals) {
                    this.vertexBufferData.set(this.getNormals()[i], offset);
                    offset += 3;
                }

                if (usedAttributes.usesUvs) {
                    this.vertexBufferData.set(this.getUvs()[i], offset);
                    offset += 2;
                }
            }
        }

        return this.vertexBufferData;
    }

    getIndexBufferData(): Uint16Array { //TODO: stop this and vertexBufferData
        if (!this.indexBufferData) {
            this.indexBufferData = new Uint16Array(this.triangles.length * 3);

            if (this.triangles.length === 0) {
                console.warn(`Mesh has no indices`);
            }

            for (let i: number = 0; i < this.triangles.length; i++) {
                this.indexBufferData.set(this.triangles[i], i * 3);
            }
        }

        return this.indexBufferData;
    }

    //misc
    getStride(): number {
        let stride: number = 0;

        if (this.getPositions().length > 0) stride += 3;
        if (this.getNormals().length > 0) stride += 3;
        if (this.getUvs().length > 0) stride += 2;

        return stride;
    }

    getUsedAttributes(): UsedVertexAttributes {
        const usedAttributes: UsedVertexAttributes = new UsedVertexAttributes();
        usedAttributes.usesPositions = this.getPositions().length > 0;
        usedAttributes.usesNormals = this.getNormals().length > 0;
        usedAttributes.usesUvs = this.getUvs().length > 0;

        return usedAttributes;
    }
}