import { Mesh } from "../core/mesh";
import { Vector3 } from "../core/model";

export function objDataToMesh(data: string): Mesh {
    const mesh: Mesh = new Mesh();

    const lines: string[] = data.split("\n");

    const vertices: Vector3[] = [];
    const normals: Vector3[] = [];

    for (const line of lines) {
        const splitLine: string[] = line.split(" ");
        const lineInst: string = splitLine[0];

        //const uvs: Vector2[] = [];

        switch (lineInst) {
            case "v": { //vertex: x, y, z
                if (splitLine.length >= 4) {
                    const [x, y, z]: number[] = splitLine.slice(1).map((val: string) => {return Number(val);});
                    vertices.push(new Vector3(x,y,z));
                }
                break;
            }
            case "vn": { //vertex normal: x, y, z
                if (splitLine.length >= 4) {
                    const [x, y, z]: number[] = splitLine.slice(1).map((val: string) => {return Number(val);});
                    normals.push(new Vector3(x,y,z));
                }
                break;
            }
            case "f": { //face: v/vt/vn v/vt/vn v/vt/vn
                if (splitLine.length >= 4) {
                    let vertsAdded = 0

                    for (const vertStr of splitLine.slice(1)) {
                        if (vertStr.length <= 0) continue;

                        const vertVals: number[] = vertStr.split("/").map((val: string) => {return Number(val);});

                        const vertPosI: number = vertVals[0] - 1;
                        const vertNormalI: number = vertVals[2] - 1;

                        const vertPos: Vector3 = vertices[vertPosI];
                        const vertNormal: Vector3 = normals[vertNormalI];

                        if (vertPos && vertNormal) {
                            mesh.positions.push(vertPos.toArray());
                            mesh.uvs.push([0,0]);
                            mesh.normals.push(vertNormal.toArray());
                        } else {
                            /*console.log(vertices);
                            console.log(normals);
                            console.log(vertVals);
                            console.log(vertStr);
                            console.log(splitLine);*/
                            throw new Error(`OBJParser: Face refers to non-existing position or normal (${line})`);
                        }

                        vertsAdded++;
                    }

                    let len: number = mesh.positions.length - vertsAdded;

                    if (vertsAdded === 3) {
                        mesh.triangles.push([len, len + 1, len + 2]);
                    } else if (vertsAdded === 4) {
                        mesh.triangles.push([len, len + 1, len + 2]);
                        mesh.triangles.push([len, len + 2, len + 3]);
                    } else {
                        console.warn(`OBJParser: Face has invalid amount of verts (${vertsAdded})`);
                    }
                }
                break;
            }
            default: {
                //console.warn(`OBJParser: (${lineInst}) is not a recognized instruction`);
                break;
            }
        }
    }

    console.log(`Parsed mesh with ${mesh.triangles.length} triangles`);
    return mesh;
}