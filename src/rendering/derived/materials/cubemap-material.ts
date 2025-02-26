import { BindGroup, BindGroupLayout, Material } from "../../core/material";
import { UsedVertexAttributes } from "../../core/mesh";
import { Texture } from "../../core/texture";
import { CubemapFSShader, CubemapVSShader } from "../../shaders/class/cubemap-shader";

export class CubemapMaterial extends Material {
    cubemapTexture!: Texture;

    beforeInit(): void {
        this.label = "cubemap";

        this.vertexAttributes = [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3',
              },
              {
                // normals
                shaderLocation: 1,
                offset: 4 * 3,
                format: 'float32x3',
              },
              {
                // uv
                shaderLocation: 2,
                offset: 4 * 3 * 2,
                format: 'float32x2',
              },
        ];
        this.vertexAttributesStride = 4 * 3 * 2 + 4 * 2;
        this.usedVertexAttributes = new UsedVertexAttributes();

        this.vsShader = new CubemapVSShader(this.renderer, this.label);
        this.fsShader = new CubemapFSShader(this.renderer, this.label);

        this.primitiveCullMode = "front";

        this.usedVertexAttributes.usesPositions = true;
        this.usedVertexAttributes.usesNormals = true;
        this.usedVertexAttributes.usesUvs = true;

        this.bindGroupLayout = new BindGroupLayout(this.renderer, this.label);
        this.bindGroupLayout.bindGroupLayoutEntries = [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: "filtering",
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    viewDimension: "cube"
                }
            }
        ];
    }

    afterInit(): void {
        this.asyncAfterInit();
    }

    async asyncAfterInit(): Promise<void> {
        const imgSrcs: string[] = [
            './assets/textures/cubemaps/ocean/right.jpg',
            './assets/textures/cubemaps/ocean/left.jpg',
            './assets/textures/cubemaps/ocean/top.jpg',
            './assets/textures/cubemaps/ocean/bottom.jpg',
            './assets/textures/cubemaps/ocean/front.jpg',
            './assets/textures/cubemaps/ocean/back.jpg',
        ];
        const promises: Promise<ImageBitmap>[] = imgSrcs.map(async (src: string) => {
            const response: Response = await fetch(src);
            return createImageBitmap(await response.blob());
        });
        const imageBitmaps: ImageBitmap[] = await Promise.all(promises);

        this.cubemapTexture = new Texture(this.renderer,
            "cubemap-ocean",
            [imageBitmaps[0].width, imageBitmaps[0].height, 6],
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
            "rgba8unorm",
        );

        for (let i: number = 0; i < imageBitmaps.length; i++) {
            this.cubemapTexture.copyExternalImageToTexture(
                { source: imageBitmaps[i] },
                {
                    texture: this.cubemapTexture.gpuTexture,
                    origin: [0,0,i]
                },
                [imageBitmaps[i].width, imageBitmaps[i].height]
            );
        }

        if (!this.renderer.device) throw new Error("Device is missing from Renderer");

        const defaultBindGroup: BindGroup = new BindGroup(this.renderer, this.label);
        defaultBindGroup.bindGroupLayout = this.bindGroupLayout;
        defaultBindGroup.bindGroupEntries = [
            {
                binding: 0,
                resource: this.renderer.device.createSampler( {minFilter: "linear", magFilter: "linear"} ),
            },
            {
                binding: 1,
                resource: this.cubemapTexture.createView({ dimension: "cube" }),
            }
        ];

        this.defaultBindGroup = defaultBindGroup;
    }

    getTargetInfos(): GPUColorTargetState[] {
        return [
            {
                format: "rgba8unorm",
            }
        ];
    }
}