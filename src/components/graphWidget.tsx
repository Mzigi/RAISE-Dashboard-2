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

export type MarkerType = null | "circle" | string;
export type GraphStyle = "line" | "bar"

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
    widthPercentage: number = 0.8; //for graph styles with width, bars

    maxMinY?: number = undefined;
    maxMinX?: number = undefined;

    xSuffix: string = "";
    ySuffix: string = "";

    marker: MarkerType = null;
    hasLabel: boolean = true;
    graphStyle: GraphStyle = "line";

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

export default function GraphWidget({ graphDescriptions, widgetName = "Unknown", leftPadding = 70, graphStyle = "line", yGridVisible = true, yAxisVisible = true, xGridVisible = true, xAxisVisible = true, yAxisLineCount = 5, xAxisLineCount = 5, scale = 1 }: { graphDescriptions: GraphDescription[], widgetName?: string, leftPadding?: number, graphStyle?: GraphStyle, yGridVisible?: boolean, yAxisVisible?: boolean, xGridVisible?: boolean, xAxisVisible?: boolean, yAxisLineCount?: number, xAxisLineCount?: number, scale?: number }): React.JSX.Element {
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
        context.lineWidth = 2 * scale;
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderInfo = {
            renderer: context,
            robotoSmall: 18 * scale,
            roboto: 24 * scale,
        }

        leftPadding *= scale;
        const PADDING = 12 * scale;
        const PADDING_TEXT_LEFT = 10 * scale;
        const PADDING_TEXT_BOTTOM = 8 * scale;
        const LETTER_HEIGHT = 18 * scale;
        const BIG_LETTER_HEIGHT = 24 * scale;

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
                if (graphDesc.maxMinY != undefined) {
                    minY = Math.min(minY, graphDesc.maxMinY);
                }
                if (graphDesc.maxMinX != undefined) {
                    minX = Math.min(minX, graphDesc.maxMinX)
                }
                boundsSet = true;
            }
        }

        let bounds = new UIBoundary(canvas.clientWidth, canvas.clientHeight, leftPadding, scale);

        //draw numbers
        if (minX !== maxX) {
            if (yAxisVisible) {
                for (let i = 0; i < yAxisLineCount; i++) { //y axis
                    let height = mapNum(i, 0.0, yAxisLineCount - 1, PADDING, (bounds.h - PADDING));
                    let value = floor(mapNum(i, 0.0, yAxisLineCount - 1, maxY, minY) * 100.0 + 0.5) / 100.0;

                    if (yAxisVisible) {
                        SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
                        SDL_RenderDrawLine(renderInfo.renderer, bounds.x + 2, bounds.y + height, bounds.x - 6, bounds.y + height); //number indent
                    }
                    if (yGridVisible) {
                        SDL_SetRenderDrawColor(renderInfo.renderer, 200, 200, 200, SDL_ALPHA_OPAQUE);
                        SDL_RenderDrawLine(renderInfo.renderer, bounds.x, bounds.y + height, bounds.x + bounds.w, bounds.y + height); //long grid line
                    }
                    drawText(renderInfo.renderer, renderInfo.robotoSmall, numAsStr(value) + graphDescriptions[0].ySuffix, bounds.x - PADDING_TEXT_LEFT, bounds.y + height - LETTER_HEIGHT / 2, 1.0, 0);
                }
            }
            
            for (let i = 0; i < xAxisLineCount; i++) { //x axis
                let height = mapNum(i, 0.0, xAxisLineCount - 1, PADDING, (bounds.w - PADDING));
                let value = floor(mapNum(i, 0.0, xAxisLineCount - 1, minX, maxX) * 100.0 + 0.5) / 100.0;

                if (xAxisVisible) {
                    SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
                    SDL_RenderDrawLine(renderInfo.renderer, bounds.x + height, bounds.y + bounds.h + 6, bounds.x + height, bounds.y + bounds.h - 2); //number indent
                }
                if (xGridVisible) {
                    SDL_SetRenderDrawColor(renderInfo.renderer, 200, 200, 200, SDL_ALPHA_OPAQUE);
                    SDL_RenderDrawLine(renderInfo.renderer, bounds.x + height, bounds.y, bounds.x + height, bounds.y + bounds.h); //long grid line
                }
                drawText(renderInfo.renderer, renderInfo.robotoSmall, numAsStr(value) + graphDescriptions[0].xSuffix, bounds.x + height, bounds.y + bounds.h + PADDING_TEXT_BOTTOM, 0.5, 0.0);
            }
            
        }

        for (let graphDesc of graphDescriptions) {
            switch (graphDesc.graphStyle) {
                case "line":
                {
                    // draw lines
                
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

                                    if (graphDesc.marker != null) {
                                        let markSize = 3 * scale;

                                        context.fillStyle = graphDesc.strokeStyle;
                                        if (graphDesc.marker == "circle") {
                                            context.beginPath();
                                            context.arc(pointX, pointY, markSize, 0, 360);
                                            context.fill();
                                            context.closePath();
                                        } else {
                                            //drawText(context, markSize, "x", pointX, pointY - markSize / 2, 0.5, 0);
                                            context.font = markSize + "p Arial";
                                            let textMeasure = context.measureText(graphDesc.marker);
                                            let strWidth = textMeasure.width;
                                            let strHeight = textMeasure.actualBoundingBoxAscent;
                                            context.fillText(graphDesc.marker, pointX - strWidth / 2, pointY + strHeight / 2);
                                        }
                                    }
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
                
                    break;
                }
                case "bar":
                {
                    // draw bars
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
                    context.fillStyle = graphDesc.strokeStyle;

                    let pointCount = points.length;

                    let i = 0;
                    for (let point of points) {
                            let pointY = (bounds.y * 2 + bounds.h) - mapNum(point.y, minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING);
                            let zeroPointY = Math.max(Math.min((bounds.y * 2 + bounds.h) - mapNum(0, minY, maxY, bounds.y + PADDING, bounds.y + bounds.h - PADDING), bounds.y + bounds.h), bounds.y);
                            let pointX = mapNum(point.x, minX, maxX, bounds.x + PADDING, bounds.x + bounds.w - PADDING);
                            let width = bounds.w / points.length * graphDesc.widthPercentage
                            //context.fillRect(pointX - width / 2, bounds.y + pointY - bounds.y, width, bounds.h - (pointY - bounds.y));
                            context.fillRect(pointX - width / 2, pointY, width, zeroPointY - pointY);
                        i++;
                    }
                    
                    break;
                }
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
            if (graphDesc.hasLabel) {
                SDL_SetRenderDrawColor(renderInfo.renderer, 255, 255, 255, 0.5);

                context.font = renderInfo.robotoSmall + "px Roboto"
                let textMeasure = context.measureText(graphDesc.name);
                let strWidth = textMeasure.width;
                let strHeight = textMeasure.actualBoundingBoxAscent;

                const rightOffset = 5 * scale;
                const textOffset = 16 * scale;
                const lineWidth = 12 * scale;
                const lineOffset = 3 * scale;

                let ux = bounds.x + 5 * scale;
                let uy = bounds.y + 5 * scale + 25 * i * scale;
                let w = textOffset + strWidth + rightOffset;
                let h = 20 * scale;

                context.fillRect(ux, uy, w, h);

                context.lineWidth = 1 * scale;
                SDL_SetRenderDrawColor(renderInfo.renderer, 0, 0, 0, SDL_ALPHA_OPAQUE);
                SDL_RenderDrawLine(context, ux, uy, ux + w, uy);
                SDL_RenderDrawLine(context, ux + w, uy, ux + w, uy + h);
                SDL_RenderDrawLine(context, ux + w, uy + h, ux, uy + h);
                SDL_RenderDrawLine(context, ux, uy + h, ux, uy);

                drawText(context, renderInfo.robotoSmall, graphDesc.name, ux + textOffset, uy + 3 * scale, 0, 0);

                context.strokeStyle = graphDesc.strokeStyle;
                context.lineWidth = 3 * scale;
                context.globalAlpha = 1;
                SDL_RenderDrawLine(context, ux + lineOffset, uy + h / 2, ux + lineWidth + lineOffset, uy + h / 2);

                i++;
            }
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
            drawText(renderInfo.renderer, renderInfo.roboto, widgetName, bounds.x + bounds.w / 2, bounds.y - 26 * scale, 0.5, 0.0);
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