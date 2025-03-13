import React, { useEffect, useRef } from "react";
import SerialConnectionData from "../common/serialConnectionData";
import { useMouseMove } from "../common/useMouseMove/useMouseMove";
import { abs, drawText, floor, GraphPoint, mapNum, SDL_ALPHA_OPAQUE, SDL_RenderDrawLine, SDL_SetRenderDrawColor, UIBoundary } from "../common/sdlLayer";

const shrinkArray = (array: any[], size: number) => {
    const step = array.length / size
    return array.filter((v, i) => Math.floor(i % step) == 0)
}

const shrinkArrayAware = (array: any[], size: number) => {
    const step = array.length / size
    return array.filter((v, i) => Math.floor(i % step) == 0 || array[i-2] !== undefined && array[i-1] !== undefined && abs(array[i-2] - array[i-1])*2 < abs(array[i-1] - array[i]))
}

function numAsStr(num: number): string {
    if (num >= 1000) {
        return (Math.round(num * 1)/1).toString();
    }
    return (Math.round(num * 10)/10).toString();
}

export class GraphDescription {
    private _real_indices: Array<number> | undefined;
    private _real_values: Array<number> | undefined;

    private _indices: Array<any>;
    private _values: Array<any>;

    private _mappedIndices: Array<number | null> | undefined;
    private _mappedValues: Array<number | null> | undefined;

    indexFunc: (val: any, index: number, array: any[]) => number = (val: any): number => {return Number(val)}
    valueFunc: (val: any, index: number, array: any[]) => number = (val: any): number => {return Number(val)};
    invalidFunc: (val: any) => boolean = (val: any): boolean => {return false};

    strokeStyle: string = "#426cf5";
    name: string = "Unknown";

    xSuffix: string = "";
    ySuffix: string = "";

    get indices() {
        if (!this._mappedIndices) {
            this._mappedIndices = shrinkArray(this.real_indices, 200);
        }

        return this._mappedIndices;
    }

    get values() {
        if (!this._mappedValues) {
            this._mappedValues = shrinkArray(this.real_values, 200);
        }

        return this._mappedValues;
    }

    get real_indices() {
        if (!this._real_indices) {
            this._real_indices = this._indices.map(this.indexFunc);
        }

        return this._real_indices;
    }

    get real_values() {
        if (!this._real_values) {
            this._real_values = this._values.map(this.valueFunc).map((val: any) => {
                return (this.invalidFunc(val) ? null : val);
            })
        }

        return this._real_values;
    }

    constructor(indices: Array<any>, values: Array<any>) {
        this._indices = indices;
        this._values = values;
    }
}

export default function GraphWidget({ graphDescriptions, widgetName = "Unknown", leftPadding = 70 }: { graphDescriptions: GraphDescription[], widgetName?: string, leftPadding?: number }): React.JSX.Element {
    const canvasRef = useRef(null); 
    let xyMousePos = useMouseMove(1000 / 30, "client");
    let mousePos = [xyMousePos.x, xyMousePos.y];

    useEffect(() => {
        const canvas: HTMLCanvasElement = (canvasRef.current as unknown as HTMLCanvasElement);
        if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
            canvas.width = canvas.clientWidth
            canvas.height = canvas.clientHeight
        }

        const context = canvas.getContext("2d");

        if (!context) return () => {};
        SDL_SetRenderDrawColor(context, 255, 255, 255, SDL_ALPHA_OPAQUE);
        context.lineWidth = 2;
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderInfo = {
            renderer: context,
            robotoSmall: 18,
            roboto: 24,
        }

        const PADDING = 12;
        const PADDING_TEXT_LEFT = 10;
        const PADDING_TEXT_BOTTOM = 8;
        const LETTER_HEIGHT = 18;
        const BIG_LETTER_HEIGHT = 24

        let minY = 0;
        let maxY = 0;
        let minX = 0;
        let maxX = 0;

        let boundsSet = false;

        for (let graphDesc of graphDescriptions) {
            if (graphDesc.values.length > 0) {
                if (boundsSet) {
                    minY = Math.min(...graphDesc.real_values.filter((val) => val != null), minY);
                    maxY = Math.max(...graphDesc.real_values.filter((val) => val != null), maxY);
                    minX = Math.min(...graphDesc.real_indices.filter((val) => val != null), minX);
                    maxX = Math.max(...graphDesc.real_indices.filter((val) => val != null), maxX);
                } else {
                    minY = Math.min(...graphDesc.real_values.filter((val) => val != null));
                    maxY = Math.max(...graphDesc.real_values.filter((val) => val != null));
                    minX = Math.min(...graphDesc.real_indices.filter((val) => val != null));
                    maxX = Math.max(...graphDesc.real_indices.filter((val) => val != null));
                }
                boundsSet = true;
            }
        }

        let bounds = new UIBoundary(canvas.clientWidth, canvas.clientHeight, leftPadding);

        //draw numbers
        if (minX !== maxX) {
            for (let i = 0; i < 5; i++) { //y axis
                let height = mapNum(i, 0.0, 4.0, PADDING, (bounds.h - PADDING));
                let value = floor(mapNum(i, 0.0, 4.0, maxY, minY) * 100.0 + 0.5) / 100.0;

                SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
                SDL_RenderDrawLine(renderInfo.renderer, bounds.x + 2, bounds.y + height, bounds.x - 6, bounds.y + height); //number indent
                SDL_SetRenderDrawColor(renderInfo.renderer, 200, 200, 200, SDL_ALPHA_OPAQUE);
                SDL_RenderDrawLine(renderInfo.renderer, bounds.x, bounds.y + height, bounds.x + bounds.w, bounds.y + height); //long grid line
                drawText(renderInfo.renderer, renderInfo.robotoSmall, numAsStr(value) + graphDescriptions[0].ySuffix, bounds.x - PADDING_TEXT_LEFT, bounds.y + height - LETTER_HEIGHT / 2, 1.0, 0);
            }
            for (let i = 0; i < 5; i++) { //x axis
                let height = mapNum(i, 0.0, 4.0, PADDING, (bounds.w - PADDING));
                let value = floor(mapNum(i, 0.0, 4.0, minX, maxX) * 100.0 + 0.5) / 100.0;

                SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
                SDL_RenderDrawLine(renderInfo.renderer, bounds.x + height, bounds.y + bounds.h + 6, bounds.x + height, bounds.y + bounds.h - 2); //number indent
                SDL_SetRenderDrawColor(renderInfo.renderer, 200, 200, 200, SDL_ALPHA_OPAQUE);
                SDL_RenderDrawLine(renderInfo.renderer, bounds.x + height, bounds.y, bounds.x + height, bounds.y + bounds.h); //long grid line

                drawText(renderInfo.renderer, renderInfo.robotoSmall, numAsStr(value) + graphDescriptions[0].xSuffix, bounds.x + height, bounds.y + bounds.h + PADDING_TEXT_BOTTOM, 0.5, 0.0);
            }
        }

        // draw lines
        for (let graphDesc of graphDescriptions) {
            //console.log(graphDesc);
            let points: GraphPoint[] = [];
            for (let i = 0; i < graphDesc.indices.length; i++) {
                let index = graphDesc.indices[i]
                let val = graphDesc.values[i]
                if (index != null && val != null) {
                    points.push(new GraphPoint(index, val));
                }
            }

            SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 200, SDL_ALPHA_OPAQUE);
            context.strokeStyle = graphDesc.strokeStyle;

            let pointCount = points.length;


            let lastPoint: GraphPoint = new GraphPoint(0,0);
            let lastPointIsNull: boolean = true;

            let shouldDrawEvery: number = 1// Math.floor(Math.max(1, pointCount / 50));

            let i = 0;
            for (let point of points) {
                if (!lastPointIsNull) {
                    let lastPointY = (bounds.y * 2 + bounds.h) - mapNum(lastPoint.y, minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING);
                    let pointY = (bounds.y * 2 + bounds.h) - mapNum(point.y, minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING);

                    if (i % shouldDrawEvery == 0 || i == points.length - 1 || abs(lastPointY - pointY) > 5) {
                        if (!lastPointIsNull) {

                            let lastPointX = mapNum(lastPoint.x, minX, maxX, bounds.x + PADDING, bounds.x + bounds.w - PADDING);


                            let pointX = mapNum(point.x, minX, maxX, bounds.x + PADDING, bounds.x + bounds.w - PADDING);

                            /*
                            int lastPointX = (int)((lastPoint.x - abs(minX)) / maxX * bounds.w) + bounds.x;
                            int lastPointY = (int)(((maxY - lastPoint.y) - abs(minY)) / maxY * bounds.h) + bounds.y;

                            int pointX = (int)((point.x - abs(minX)) / maxX * bounds.w) + bounds.x;
                            int pointY = (int)(((maxY - point.y) - abs(minY)) / maxY * bounds.h) + bounds.y;
                            */

                            SDL_RenderDrawLine(renderInfo.renderer, lastPointX, lastPointY, pointX, pointY);
                        }

                        lastPoint = point;
                        lastPointIsNull = false;
                    }
                }
                else {
                    lastPoint = point;
                    lastPointIsNull = false;
                }

                i++;
            }
        }

        /*let candidatePoints: [number,number][] = []
        let candidateStrokes: string[] = []

        for (let graphDesc of graphDescriptions) {
            if (mousePos && positionIsInBoundaries(canvas, canvas.width, canvas.height, mousePos[0], mousePos[1]) && graphDesc.indices.length >= 2) {
                let mousexTransformed = (mousePos[0] - 40) //70 is LEFT_PADDING
                let closestPointIndex = Math.floor(clamp(mapNum(mousexTransformed, bounds.x + PADDING, bounds.x + bounds.w - PADDING - 40, 0.0, graphDesc.indices.length - 1), 0, graphDesc.indices.length - 1));
                candidatePoints.push([graphDesc.indices[closestPointIndex], graphDesc.values[closestPointIndex]]);
                candidateStrokes.push(graphDesc.strokeStyle)
            }
        }

        let candidateIndex = undefined
        let lastDiff = undefined

        for (let i = 0; i < candidatePoints.length; i++) {
            let pointY = (bounds.y * 2 + bounds.h) - mapNum(candidatePoints[i][1], minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING);
            let mouseYTransformed = (mousePos[1] - (canvas.getBoundingClientRect().top + 30)) //30 is TOP_PADDING
            let mouseYInGraph = mapNum(mouseYTransformed, PADDING, bounds.h - PADDING, minY, maxY);
            if (!lastDiff || Math.abs(pointY - mouseYInGraph) < lastDiff) {
                candidateIndex = i;
                lastDiff = Math.abs(pointY - mouseYInGraph)
            }
        }

        if (candidateIndex !== undefined && candidatePoints[candidateIndex]) {
            let closestPoint = candidatePoints[candidateIndex]
            let closestStroke = candidateStrokes[candidateIndex]

            let pointX = mapNum(closestPoint[0], minX, maxX, bounds.x + PADDING, bounds.x + bounds.w - PADDING);
            let pointY = (bounds.y * 2 + bounds.h) - mapNum(closestPoint[1], minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING);

            let pointValue = floor(closestPoint[1] * 10.0 + 0.5) / 10.0;
            let pointXValue = floor(closestPoint[0] * 10.0 + 0.5) / 10.0;

            context.fillStyle = closestStroke;
            context.fillRect(pointX - 4, pointY - 4, 8, 8)

            let pointXStr = pointXValue.toString();
            let pointYStr = pointValue.toString();

            let pointPosStr = "[" + pointXStr + "," + pointYStr + "]";

            drawText(renderInfo.renderer, renderInfo.robotoSmall, pointPosStr, pointX, pointY - LETTER_HEIGHT - 8, mousePos[0] <= canvas.getBoundingClientRect().left + canvas.width / 2 ? 0 : 1, 0.0);
        }*/
        
        //draw window outline
        SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x, bounds.y + bounds.h, bounds.x + bounds.w, bounds.y + bounds.h);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x, bounds.y, bounds.x + bounds.w, bounds.y);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x + bounds.w, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);

        //draw color infos for each graph
        let i = 0;
        for (let graphDesc of graphDescriptions) {
            SDL_SetRenderDrawColor(renderInfo.renderer, 255, 255, 255, 0.5);

            context.font = renderInfo.robotoSmall + "px Roboto"
            let textMeasure = context.measureText(graphDesc.name);
            let strWidth = textMeasure.width;
            let strHeight = textMeasure.actualBoundingBoxAscent;

            const rightOffset = 5;
            const textOffset = 16;
            const lineWidth = 12;
            const lineOffset = 3;

            let ux = bounds.x + 5;
            let uy = bounds.y + 5 + 25 * i;
            let w = textOffset + strWidth + rightOffset;
            let h = 20;

            context.fillRect(ux, uy, w, h);

            context.lineWidth = 1;
            SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
            SDL_RenderDrawLine(context, ux, uy, ux + w, uy);
            SDL_RenderDrawLine(context, ux + w, uy, ux + w, uy + h);
            SDL_RenderDrawLine(context, ux + w, uy + h, ux, uy + h);
            SDL_RenderDrawLine(context, ux, uy + h, ux, uy);

            drawText(context, renderInfo.robotoSmall, graphDesc.name, ux + textOffset, uy + 3, 0, 0);

            context.strokeStyle = graphDesc.strokeStyle;
            context.lineWidth = 3;
            context.globalAlpha = 1;
            SDL_RenderDrawLine(context, ux + lineOffset, uy + h / 2, ux + lineWidth + lineOffset, uy + h / 2);

            i++;
        }

        /*SDL_RenderDrawLine(renderInfo.renderer, bounds.x + PADDING, bounds.y + bounds.h + 2, bounds.x + PADDING, bounds.y + bounds.h - 2);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x + bounds.w - PADDING, bounds.y + bounds.h + 2, bounds.x + bounds.w - PADDING, bounds.y + bounds.h - 2);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x + 2, bounds.y + bounds.h - PADDING, bounds.x - 2, bounds.y + bounds.h - PADDING);
        SDL_RenderDrawLine(renderInfo.renderer, bounds.x + 2, bounds.y + PADDING, bounds.x - 2, bounds.y + PADDING);

        //draw numbers
        drawText(renderInfo.renderer, renderInfo.robotoSmall, std::vformat("{}", std::make_format_args(minX)).c_str(), bounds.x + PADDING, bounds.y + bounds.h, 0.5, 0.0);
        drawText(renderInfo.renderer, renderInfo.robotoSmall, std::vformat("{}", std::make_format_args(maxX)).c_str(), bounds.x + bounds.w - PADDING, bounds.y + bounds.h, 0.5, 0.0);


        drawText(renderInfo.renderer, renderInfo.robotoSmall, std::vformat("{}", std::make_format_args(minY)).c_str(), bounds.x - PADDING_TEXT_LEFT, bounds.y + bounds.h - PADDING - LETTER_HEIGHT / 2, 1.0, 0);
        drawText(renderInfo.renderer, renderInfo.robotoSmall, std::vformat("{}", std::make_format_args(maxY)).c_str(), bounds.x - PADDING_TEXT_LEFT, bounds.y + PADDING - LETTER_HEIGHT / 2, 1.0, 0);
        */
        if (widgetName.length > 0) {
            drawText(renderInfo.renderer, renderInfo.roboto, widgetName, bounds.x + bounds.w / 2, bounds.y - 26, 0.5, 0.0);
        }

        return () => {

        }
    })

    return (
        <div className="widget graph-widget">
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}