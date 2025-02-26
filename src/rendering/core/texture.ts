import { Renderer } from "../renderer";
import { GPUObject } from "./gpuObject";

type Size = [number, number, number];

export class Texture extends GPUObject {
    renderer: Renderer;

    gpuTexture!: GPUTexture;

    size: Size;
    format: GPUTextureFormat;
    usage: GPUTextureUsageFlags;

    //rendering to texture
    matchCanvas: boolean;
    view: GPUTextureView | undefined;

    constructor(renderer: Renderer, uniqueName: string, size: Size, usage: GPUTextureUsageFlags, format: GPUTextureFormat, matchCanvas: boolean = false) {
        super(renderer, `Texture-${uniqueName}`);

        this.renderer = renderer;

        this.size = size;
        this.format = format;
        this.usage = usage;
        this.matchCanvas = matchCanvas;

        this.create();

        this.renderer.addTexture(this);
    }

    create(): void {
        if (this.gpuTexture) {
            this.gpuTexture.destroy();
        }

        if (this.view) {
            this.view = undefined;
        }

        if (this.matchCanvas) {
            this.size = [this.renderer.canvas.width, this.renderer.canvas.height, 1];
        }

        //console.log(`Creating texture (${this.label})`);

        this.gpuTexture = (this.renderer.device as GPUDevice).createTexture({
            size: this.size,
            usage: this.usage,
            format: this.format,
            label: this.label,
        });
    }

    createView(descriptor: GPUTextureViewDescriptor = {}): GPUTextureView {
        if (!this.view) {
            this.view = this.gpuTexture.createView(descriptor);
        }

        return this.view;
    }

    copyFromExternalImage(imageBitmap: GPUCopyExternalImageSource, flipY: boolean = false): void {
        (this.renderer.device as GPUDevice).queue.copyExternalImageToTexture(
            {
                source: imageBitmap,
                flipY: flipY,
            },
            {
                texture: this.gpuTexture,
            },
            this.size
        );
    }

    copyExternalImageToTexture(source: GPUCopyExternalImageSourceInfo, destination: GPUCopyExternalImageDestInfo, sourceSize: GPUExtent3DStrict): void {
        destination.texture = this.gpuTexture;

        (this.renderer.device as GPUDevice).queue.copyExternalImageToTexture(
            source,
            destination,
            sourceSize,
        );
    }

    hasView(): boolean {
        return !!this.view;
    }

    /*
    const gBufferTexture2DFloat16 = device.createTexture({
        size: [canvas.width, canvas.height],
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        format: 'rgba16float',
    });
    */
    /*
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'depth24plus',
    });
    */
    /*
    let cubeTexture: GPUTexture;
    {
        const response = await fetch('../../assets/img/Di-3d.png');
        const imageBitmap = await createImageBitmap(await response.blob());

        cubeTexture = device.createTexture({
            size: [imageBitmap.width, imageBitmap.height, 1],
            format: 'rgba8unorm',
            usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: cubeTexture },
            [imageBitmap.width, imageBitmap.height]
        );
    }
    */
}