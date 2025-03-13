export class UIBoundary {
    x: number = 0;
    y: number = 0;
    w: number = 0;
    h: number = 0;

    constructor(canvasWidth: number, canvasHeight: number, newLeftPadding: number = 70) {
        const RIGHT_PADDING = 20;
        const LEFT_PADDING = newLeftPadding;

        const TOP_PADDING = 30;
        const BOTTOM_PADDING = 30;

        this.x += LEFT_PADDING;
        this.y += TOP_PADDING
        this.w = canvasWidth - LEFT_PADDING - RIGHT_PADDING;
        this.h = canvasHeight - BOTTOM_PADDING - TOP_PADDING;
    }
}

export class GraphPoint {
    x: number = 0;
    y: number = 0;

    distance(graphPoint: GraphPoint) {
        return Math.sqrt(Math.pow(this.x - graphPoint.x,2) + Math.pow(this.y - graphPoint.y,2))
    }

    constructor(newX: number, newY: number) {
        this.x = newX;
        this.y = newY;
    }
}

export const SDL_ALPHA_OPAQUE = 1;

export function lerp(x1: number, x2: number, t: number): number {
	return (x2 - x1) * t + x1;
}

export function invLerp(x1: number, x2: number, p: number): number {
	return ((p - x1) / (x2 - x1));
}

export function mapNum(n: number, a1: number, a2: number, b1: number, b2: number): number {
	return lerp(b1, b2, invLerp(a1, a2, n));
}

export function floor(num: number): number {
    return Math.floor(num);
}

export function abs(num: number): number {
    return Math.abs(num);
}

export function clamp(num: number, min: number, max: number) {
    return Math.max(Math.min(num,max),min);
}

export function positionIsInBoundaries(canvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number, px: number, py: number): boolean {
    let boundaries = new UIBoundary(canvasWidth, canvasHeight);
    px -= canvas.getBoundingClientRect().left;
    py -= canvas.getBoundingClientRect().top;

    return px >= boundaries.x && px <= boundaries.x + boundaries.w && py >= boundaries.y && py <= boundaries.y + boundaries.h;
}

export function SDL_SetRenderDrawColor(context: CanvasRenderingContext2D, r: number, g: number, b: number, a: number) {
    context.fillStyle = `rgb(${r},${g},${b})`;
    context.strokeStyle = `rgb(${r},${g},${b})`;
    context.globalAlpha = a;
}

export function SDL_RenderDrawLine(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();

    //console.log(`Line from ${x0},${y0} to ${x1},${y1}`)
}

export function hexToRgb(hex: string) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 255};
}

export function drawText(context: CanvasRenderingContext2D, font: number, str: string, x: number, y: number, anchorX: number, anchorY: number, fillStyle: string = "#000"): number {
    if (!font) return 1;

    let ogFillStyle = context.fillStyle.toString();
    let ogAlpha = context.globalAlpha;

    context.font = font + "px Roboto";

    let textMeasure = context.measureText(str);
    let strWidth = textMeasure.width;
    let strHeight = textMeasure.actualBoundingBoxAscent;

    //SDL_SetRenderDrawColor(context, 0, 0, 0, SDL_ALPHA_OPAQUE);
    context.fillStyle = fillStyle;

    context.fillText(str, x - (strWidth * anchorX), y + strHeight);

    let ogFillStyleRGB = hexToRgb(ogFillStyle);
    SDL_SetRenderDrawColor(context, ogFillStyleRGB.r, ogFillStyleRGB.g, ogFillStyleRGB.b, ogAlpha);

    return 0;
}