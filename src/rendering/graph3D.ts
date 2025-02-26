import SerialConnectionData from "../common/serialConnectionData";
import { Camera } from "../rendering/core/camera";
import { PointLight } from "../rendering/core/light";
import { BindGroup, MaterialView } from "../rendering/core/material";
import { Mesh } from "../rendering/core/mesh";
import { Model, Vector3 } from "../rendering/core/model";
import { RenderGraph } from "../rendering/core/renderGraph";
import { GetCubeMesh } from "../rendering/data/meshes/cube";
import { CubeGBufferMaterial } from "../rendering/derived/materials/cubeGBuffer-material";
import { CubemapMaterial } from "../rendering/derived/materials/cubemap-material";
import { objDataToMesh } from "../rendering/parsers/objParser";
import { Renderer } from "../rendering/renderer";

const STATION_LIGHT_DISTANCE = 200;
const STATION_LIGHT_SIN_DISTANCE = 800
const SIN_DIVIDER = 60;

export class Rubiks {
    renderer: Renderer;

    renderGraph!: RenderGraph;
    camera!: Camera;

    created: boolean = false;

    stationModels: Model[] = [];
    stationLights: PointLight[] = [];

    frameCount: number = 0;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
    }

    init(): void {
        if (!this.renderer.renderGraph) throw new Error("Renderer is missing RenderGraph");

        this.renderGraph = this.renderer.renderGraph;

        if (!this.renderGraph.camera) throw new Error("RenderGraph is missing Camera");

        this.camera = this.renderGraph.camera;

        document.body.addEventListener("keydown", (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW":
                    this.camera.position.z -= 1;
                    break;
                case "KeyA":
                    this.camera.position.x -= 1;
                    break;
                case "KeyD":
                    this.camera.position.x += 1;
                    break;
                case "KeyS":
                    this.camera.position.z += 1;
                    break;
                case "Space":
                    this.camera.position.y += 1;
                    break;
                case "KeyQ":
                    this.camera.position.y -= 1;
                    break;

                case "ArrowRight":
                    this.camera.rotation.y -= 3;
                    break;
                case "ArrowLeft":
                    this.camera.rotation.y += 3;
                    break;
                case "ArrowUp":
                    this.camera.rotation.x += 3;
                    break;
                case "ArrowDown":
                    this.camera.rotation.x -= 3;
                    break;
            }
            //console.log(e.code);
        });

        this.doStuff();
    }

    doStuff(): void {
        const cubemapModel: Model = new Model(this.renderer, GetCubeMesh(), "cubemap");
        cubemapModel.forwardMat = new MaterialView(CubemapMaterial.get(this.renderer));
        cubemapModel.getIndexBuffer();
        cubemapModel.getVertexBuffer();

        this.renderer.addModel(cubemapModel);

        (CubeGBufferMaterial.get(this.renderer) as CubeGBufferMaterial).getBindGroupForTexture('./assets/textures/ground.png').then((bindGroup: BindGroup) => {
            const cubeModel: Model = new Model(this.renderer, GetCubeMesh(), "ground");
            cubeModel.gBufferMat = new MaterialView(CubeGBufferMaterial.get(this.renderer));
            cubeModel.getIndexBuffer();
            cubeModel.getVertexBuffer();
            cubeModel.position = new Vector3(0, -1, 0);
            cubeModel.size = new Vector3(2000, 1, 2000);
            
            if (cubeModel.gBufferMat) {
                cubeModel.gBufferMat.bindGroup = bindGroup;
            }
            

            this.renderer.addModel(cubeModel);
        });

        fetch("./assets/mesh/station_2.obj").then((response: Response) => {
            response.text().then((data: string) => {
                for (let i = 0; i < 3; i++) {
                    const stationMesh: Mesh = objDataToMesh(data);
                    const stationModel: Model = new Model(this.renderer, stationMesh, "station");
                    stationModel.gBufferMat = new MaterialView(CubeGBufferMaterial.get(this.renderer));
                    stationModel.getIndexBuffer();
                    stationModel.getVertexBuffer();
                    stationModel.position = [new Vector3(0, 0, 0), new Vector3(1000,0,0), new Vector3(0,0,1000)][i];
                    stationModel.size = new Vector3(10, 10, 10);
                    //stationModel.rotation = new Vector3(270, 0, 0);

                    const pointLight: PointLight = new PointLight();
                    pointLight.position = stationModel.position.clone();
                    pointLight.position.y += 5;
                    pointLight.distance = STATION_LIGHT_DISTANCE;
                    pointLight.diffuseColor = new Vector3(66,108,245);
                    pointLight.specularColor = pointLight.diffuseColor.clone();

                    this.renderer.addLight(pointLight);
                    this.renderer.addModel(stationModel);

                    this.stationModels.push(stationModel);
                    this.stationLights.push(pointLight);
                }

                for (let stationModel of this.stationModels) {
                    (CubeGBufferMaterial.get(this.renderer) as CubeGBufferMaterial).getBindGroupForTexture('./assets/textures/station.png').then((bindGroup: BindGroup) => {
                        if (stationModel.gBufferMat) {
                            stationModel.gBufferMat.bindGroup = bindGroup;
                        }
                    });
                }
            });
        });

        fetch("./assets/mesh/dummy_2.obj").then((response: Response) => {
            response.text().then((data: string) => {
                const dummyMesh: Mesh = objDataToMesh(data);
                const dummyModel: Model = new Model(this.renderer, dummyMesh, "dummy");
                dummyModel.gBufferMat = new MaterialView(CubeGBufferMaterial.get(this.renderer));
                dummyModel.getIndexBuffer();
                dummyModel.getVertexBuffer();
                dummyModel.position = new Vector3(1, 1.25, 0);
                dummyModel.size = new Vector3(1, 1, 1);

                (CubeGBufferMaterial.get(this.renderer) as CubeGBufferMaterial).getBindGroupForTexture('./assets/textures/station.png').then((bindGroup: BindGroup) => {
                    if (dummyModel.gBufferMat) {
                        dummyModel.gBufferMat.bindGroup = bindGroup;
                    }
                });

                this.renderer.addModel(dummyModel);
            });
        });

        this.created = true;
    }

    update(): void {
        if (!this.created) return;
        this.frameCount += 1;

        const serialData: SerialConnectionData = (window as any)["serialData"];
        const latestGroup = serialData.serialData[serialData.serialData.length - 1];

        for (const stationLight of this.stationLights) {
            stationLight.distance = STATION_LIGHT_DISTANCE + STATION_LIGHT_SIN_DISTANCE * Math.abs(Math.sin(this.frameCount / SIN_DIVIDER));
        }
        console.log(Math.sin(this.frameCount))

        if (!latestGroup) return;

        this.stationModels[0].position = new Vector3(0, latestGroup.T2 / 100, 0);
    }
}