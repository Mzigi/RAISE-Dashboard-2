import React, { useEffect, useRef, useState } from "react";
import { useMouseMove } from "../common/useMouseMove/useMouseMove";
import { clamp, drawText, mapNum, SDL_ALPHA_OPAQUE, SDL_RenderDrawLine, SDL_SetRenderDrawColor } from "../common/sdlLayer";
import { Camera } from "../rendering/core/camera";
import { Vector2, Vector3 } from "../rendering/core/model";
import { mat4 } from "wgpu-matrix";

let mouseDiff = new Vector2(0,0);
let isMouseDown: boolean = false;
let isMouseDownRN: boolean = false;
const mouseSensitivity = 0.3;
let cameraZoom: number = 3;

let lowerBound = new Vector3(-1000,0,-1000);
let upperBound = new Vector3(1000,1000,1000);

let graphWidth = 2;
let graphHeight = 1;

let gridResolution: number = 5;
let textOffset: number = 0.2;

let lastAnimationFrameId: number | null = null;

function numAsStr(num: number): string {
    if (num >= 1000) {
        return (Math.round(num * 1)/1).toString();
    }
    return (Math.round(num * 10)/10).toString();
}

function rad(degrees: number) { return degrees * Math.PI / 180 }

function sign(num: number): number {
    return num >= 0 ? 1 : -1;
}

function getAngleVector2(angleinrad: number): Vector2 { return new Vector2(Math.cos(angleinrad), -Math.sin(angleinrad)) }

function getAngleVector3(yAngleRad: number, xAngleRad: number): Vector3 {
    let x = Math.cos(yAngleRad) * Math.cos(xAngleRad);
    let z = Math.sin(yAngleRad) * Math.cos(xAngleRad);
    let y = Math.sin(xAngleRad);

    return new Vector3(z,-y,x);
}

function getBoundsSize(): Vector3 {
    return upperBound.minus(lowerBound);
}

function multiplyVec3(m: Float32Array, vec3: Vector3): number[] {
    let x = vec3.x
    let y = vec3.y
    let z = vec3.z

    return [
        x * m[0] +
        y * m[4] + 
        z * m[8] + 
        m[12],

        x * m[1] +
        y * m[5] + 
        z * m[9] + 
        m[13],

        x * m[2] +
        y * m[6] + 
        z * m[10] + 
        m[14],

        x * m[3] +
        y * m[7] + 
        z * m[11] + 
        m[15],
    ]
}

function multipliedVec3ToScreen(m: number[], resolution: Vector2): Vector3 {
    let tv0 = m[0] / m[3];
    let tv1 = m[1] / m[3];

    return new Vector3(tv0 * resolution.x / 2 + resolution.x / 2, tv1 * resolution.y / 2 + resolution.y / 2, m[3]);
}

function vec3ToScreen(viewProjMat: Float32Array, resolution: Vector2, vec3: Vector3): Vector3 {
    return multipliedVec3ToScreen(multiplyVec3(viewProjMat, vec3), resolution);
}

function prepareLine3D(context: CanvasRenderingContext2D, camera: Camera, viewProjMat: Float32Array, resolution: Vector2, from: Vector3, to: Vector3, shouldMoveTo: boolean = true, depth: number = 0) {
    let start: Vector3 = vec3ToScreen(viewProjMat, resolution, from);
    let end: Vector3 = vec3ToScreen(viewProjMat, resolution, to);

    if (start.z >= camera.nearZ && end.z >= camera.nearZ) {
        //draw line
        if (shouldMoveTo) {
            context.moveTo(start.x, start.y);
        }
        context.lineTo(end.x, end.y);
    } else if (depth <= 4) {
        //split line
        let middle: Vector3 = to.minus(from).divide(new Vector3(2)).add(from);

        prepareLine3D(context, camera, viewProjMat, resolution, from, middle, shouldMoveTo, depth + 1);
        prepareLine3D(context, camera, viewProjMat, resolution, middle, to, shouldMoveTo, depth + 1);
    }
}

function prepareCircle3D(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, camera: Camera, viewProjMat: Float32Array, resolution: Vector2, pos: Vector3, radius: number, zAffected: boolean = true) {
    let screenPos: Vector3 = vec3ToScreen(viewProjMat, resolution, pos);
    if (screenPos.z >= camera.nearZ) {
        if (!zAffected) {
            screenPos.z = 1;
        }

        let actualSize = radius / screenPos.z;

        if (zAffected) {
            actualSize *= canvas.width;
        }
        context.arc(screenPos.x, screenPos.y, actualSize, 0, rad(360));
    }
}

function drawText3D(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, camera: Camera, viewProjMat: Float32Array, resolution: Vector2, pos: Vector3, size: number, str: string, zAffected: boolean = true, fillStyle: string = "#000") {
    let screenPos: Vector3 = vec3ToScreen(viewProjMat, resolution, pos);
    if (screenPos.z >= camera.nearZ) {
        if (!zAffected) {
            screenPos.z = 1;
        }

        let actualSize = size / screenPos.z;
    
        if (zAffected) {
            actualSize *= canvas.width;
        }
        drawText(context, actualSize, str, screenPos.x, screenPos.y - actualSize / 2, 0.5, 0, fillStyle);
    }
}

function updateOrbitalCamera(camera: Camera, mouseDiff: Vector2) {
    camera.rotation.y += mouseDiff.x * mouseSensitivity;
    camera.rotation.x = clamp(camera.rotation.x - mouseDiff.y * mouseSensitivity, -90, 90);

    let cameraChange: Vector3 = getAngleVector3(rad(camera.rotation.y), rad(camera.rotation.x)).multiply(new Vector3(cameraZoom)).add(new Vector3(graphWidth/2,graphHeight/2,graphWidth/2));
    camera.position = cameraChange;
}

const shrinkArray = (array: any[], size: number) => {
    const step = array.length / size
    return array.filter((v, i) => Math.floor(i % step) == 0)
}

export class GraphDescription3 {
    private _indices: Array<any>
    private _values: Array<any>;

    private _mappedIndices: Array<number | null> | undefined;
    private _mappedValues: Array<Vector3 | null> | undefined;

    indexFunc: (val: any, index: number, array: any[]) => number = (val: any): number => {return Number(val)}
    valueFunc: (val: any, rssi: [number,number,number]) => Vector3 = (val: any, rssi: [number,number,number]): Vector3 => {return new Vector3(Number(val + rssi))};
    invalidFunc: (val: any) => boolean = (val: any): boolean => {return false};

    strokeStyle: string = "#426cf5";
    name: string = "Unknown";

    get indices() {
        if (!this._mappedIndices) {
            this._mappedIndices = shrinkArray(this._indices.map(this.indexFunc),300);
        }

        return this._mappedIndices;
    }

    values(rssi: [number,number,number]) {
        if (!this._mappedValues) {
            this._mappedValues = shrinkArray(
                this._values.map((val: any) => {
                    return this.valueFunc(val, rssi)
                }).map((val: any) => {
                    return (this.invalidFunc(val) ? null : val);
                })
            ,300);
        }

        return this._mappedValues;
    }

    constructor(indices: Array<any>, values: Array<any>) {
        this._indices = indices;
        this._values = values;
    }
}

function render(camera: Camera, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, widgetName: string, graphDescs: GraphDescription3[], markedPoints: Vector3[], rssi: [number,number,number], setMarkedPoints?: Function, scale: number = 1) {
    if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
    }
    const resolution: Vector2 = new Vector2(canvas.width, canvas.height);

    context.lineWidth = 2 * scale;
    context.clearRect(0, 0, canvas.width, canvas.height);

    //update
    if (isMouseDown) {
        updateOrbitalCamera(camera, mouseDiff);
    }

    //render
    const viewProjMat = camera.getViewProjectionMatrix(canvas.width / canvas.height);
    context.fillStyle = "#000"

    /*for (let i = 0; i < 8; i++) {
        const testTextPos = vec3ToScreen(viewProjMat, resolution, [new Vector3(0,0,0), new Vector3(0,1,0), new Vector3(1,1,0), new Vector3(1,0,0), new Vector3(0,0,1), new Vector3(0,1,1), new Vector3(1,1,1), new Vector3(1,0,1)][i]);
        if (testTextPos.z >= camera.nearZ) {
            drawText(context, 18, "test", testTextPos.x, testTextPos.y - 18 / 2, 0.5, 0);
        }
    }*/

    /*const testTextPos = vec3ToScreen(viewProjMat, resolution, new Vector3(0,2,0));
    if (testTextPos.z >= camera.nearZ) {
        drawText(context, 18, "Y+", testTextPos.x, testTextPos.y - 18 / 2, 0.5, 0);
    }*/

    //prepare for grid rendering
    let xSidePositive = camera.position.x < 0.5 * graphWidth;
    let ySidePositive = camera.position.y < 0.75 * graphHeight;
    let zSidePositive = camera.position.z < 0.5 * graphWidth;

    let stepX = graphWidth / (gridResolution - 1)
    let stepY = graphHeight / (gridResolution - 1)

    context.lineWidth = 1.5 * scale

    SDL_SetRenderDrawColor(context, 200, 200, 200, SDL_ALPHA_OPAQUE);
    context.beginPath();

    //bottom/top
    let yHeight = ySidePositive ? graphHeight : 0;

    for (let x = 0; x < gridResolution; x++) {
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(stepX * x, yHeight,-(!zSidePositive ? 0 : textOffset)), new Vector3(stepX * x, yHeight, graphWidth +(zSidePositive ? 0 : textOffset)));
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(-(!xSidePositive ? 0 : textOffset), yHeight, stepX * x), new Vector3(graphWidth +(xSidePositive ? 0 : textOffset), yHeight, stepX * x));
    }

    //left/right
    let xDist = xSidePositive ? graphWidth : 0;

    for (let y = 0; y < gridResolution; y++) {
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(xDist, stepY * y, 0), new Vector3(xDist, stepY * y, graphWidth));
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(xDist, 0, stepX * y), new Vector3(xDist, graphHeight, stepX * y));
    }
    

    //front/back
    let zDist = zSidePositive ? graphWidth : 0;

    for (let y = 0; y < gridResolution; y++) {
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0, stepY * y, zDist), new Vector3(graphWidth, stepY * y, zDist));
        prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(stepX * y, 0, zDist), new Vector3(stepX * y, graphHeight, zDist));
    }

    context.stroke();

    //outline rendering
    //context.lineWidth = 2;
    SDL_SetRenderDrawColor(context, 100, 100, 100, SDL_ALPHA_OPAQUE);

    context.beginPath();

    //bottom
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(graphWidth - xDist, yHeight, 0), new Vector3(graphWidth - xDist, yHeight, graphWidth));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0, yHeight, graphWidth - zDist), new Vector3(graphWidth, yHeight, graphWidth - zDist));

    //top
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(xDist, graphHeight - yHeight, 0), new Vector3(xDist, graphHeight - yHeight, graphWidth));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0, graphHeight - yHeight, zDist), new Vector3(graphWidth, graphHeight - yHeight, zDist));

    //sides
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(graphWidth - xDist, 0, zDist), new Vector3(graphWidth - xDist, graphHeight, zDist));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(xDist, 0, graphWidth - zDist), new Vector3(xDist, graphHeight, graphWidth - zDist));

    context.stroke();

    //xyz
    context.strokeStyle = "#f00"
    context.beginPath();
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,1,0), new Vector3(graphWidth + textOffset,1,0));
    context.stroke();
    drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(graphWidth / 2, 1 - textOffset,0), 16, "X+", false, "#f00");

    context.strokeStyle = "#0f0"
    context.beginPath();
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,-textOffset,0), new Vector3(0,graphHeight,0));
    context.stroke();
    drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(textOffset, graphHeight / 2,0), 16, "Y+", false, "#0f0");

    context.strokeStyle = "#00f"
    context.beginPath();
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,1,0), new Vector3(0,1,graphWidth + textOffset));
    context.stroke();
    drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(0, 1 - textOffset,graphWidth / 2), 16, "Z+", false, "#00f");

    //numbers
    let textWidth = graphWidth / gridResolution / 7;

    for (let i = 0; i < gridResolution; i++) {
        //let xTextOffset = textOffset / (xSidePositive ? -(gridResolution+1 - i) : (i+1))
        let xTextOffset = 0;
        let numStrX = new Intl.NumberFormat(["en-US"], {"maximumFractionDigits":1, "useGrouping": "always"}).format(lowerBound.x + i/(gridResolution-1) * (upperBound.x - lowerBound.x)) + "m";
        drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(stepX * i + xTextOffset,yHeight + 0.01 * sign(yHeight),graphWidth - zDist + (zSidePositive ? -textOffset : textOffset)*2), textWidth, numStrX, true);

        let zTextOffset = 0;
        let numStrZ = new Intl.NumberFormat(["en-US"], {"maximumFractionDigits":1, "useGrouping": "always"}).format(lowerBound.z + i/(gridResolution-1) * (upperBound.z - lowerBound.z)) + "m";
        drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(graphWidth - xDist + (xSidePositive ? -textOffset : textOffset)*2,yHeight + 0.01 * sign(yHeight),stepX * i + zTextOffset), textWidth, numStrZ, true);
    
        let yTextOffset = textOffset
        let numStrY = new Intl.NumberFormat(["en-US"], {"maximumFractionDigits":1, "useGrouping": "always"}).format(upperBound.y + i/(gridResolution-1) * (lowerBound.y - upperBound.y)) + "m";
        drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(xDist,stepY*i - stepY/3,graphWidth-zDist + yTextOffset*sign(zDist-0.001)), textWidth, numStrY, true);

        //let numStrY = new Intl.NumberFormat(["en-US"], {"maximumFractionDigits":1, "useGrouping": "always"}).format(lowerBound.z + i/(gridResolution-1) * (upperBound.z - lowerBound.z));
        //drawText3D(canvas, context, camera, viewProjMat, resolution, new Vector3(graphWidth - xDist + (xSidePositive ? -textOffset : textOffset)*2,yHeight + 0.01 * sign(yHeight),stepX * i + textOffset / (i+1)), textWidth, numStrZ, true);
    }

    //draw marked points
    for (let markedPoint of markedPoints) {
        let mappedMarkedPoint = markedPoint.clone();
        mappedMarkedPoint.x = mapNum(mappedMarkedPoint.x, lowerBound.x, upperBound.x, 0, graphWidth);
        mappedMarkedPoint.y = mapNum(mappedMarkedPoint.y, lowerBound.y, upperBound.y, graphHeight, 0);
        mappedMarkedPoint.z = mapNum(mappedMarkedPoint.z, lowerBound.z, upperBound.z, 0, graphWidth);

        drawText3D(canvas, context, camera, viewProjMat, resolution, mappedMarkedPoint, 0.1, "/|\\", true, "#f5d142")
    }

    //draw the graph itself
    for (let graphDesc of graphDescs) {
        context.strokeStyle = graphDesc.strokeStyle;
        context.fillStyle = graphDesc.strokeStyle;
        
        context.beginPath();

        let lastVal = new Vector3(0);
        let lastValIsNull: boolean = true;

        for (let val of graphDesc.values(rssi)) {
            if (val) {
                val = val.clone();
                val.x = mapNum(val.x, lowerBound.x, upperBound.x, 0, graphWidth);
                val.y = mapNum(val.y, lowerBound.y, upperBound.y, graphHeight, 0);
                val.z = mapNum(val.z, lowerBound.z, upperBound.z, 0, graphWidth);

                if (!lastValIsNull) {
                    prepareLine3D(context, camera, viewProjMat, resolution, lastVal, val, false);
                }

                lastVal = val.clone();
                lastValIsNull = false;
            }
        }

        context.stroke();

        let endVal = graphDesc.values(rssi)[graphDesc.values(rssi).length - 1]

        if (endVal) {
            //console.log(endVal);
            let mappedEndVal = endVal.clone();
            mappedEndVal.x = mapNum(mappedEndVal.x, lowerBound.x, upperBound.x, 0, graphWidth);
            mappedEndVal.y = mapNum(mappedEndVal.y, lowerBound.y, upperBound.y, graphHeight, 0);
            mappedEndVal.z = mapNum(mappedEndVal.z, lowerBound.z, upperBound.z, 0, graphWidth);

            context.beginPath();
            prepareCircle3D(canvas, context, camera, viewProjMat, resolution, mappedEndVal, 0.01, true);
            context.fill();
        }
    }

    //draw color infos for each graph
    let i = 0;
    for (let graphDesc of graphDescs) {
        SDL_SetRenderDrawColor(context, 255, 255, 255, 0.5);

        context.font = 18 + "px Roboto"
        let textMeasure = context.measureText(graphDesc.name);
        let strWidth = textMeasure.width;
        let strHeight = textMeasure.actualBoundingBoxAscent;

        const rightOffset = 5;
        const textOffset = 16;
        const lineWidth = 12;
        const lineOffset = 3;

        let ux = 0 + 5;
        let uy = 0 + 5 + 25 * i;
        let w = textOffset + strWidth + rightOffset;
        let h = 20;

        context.fillRect(ux, uy, w, h);

        context.lineWidth = 1 * scale;
        SDL_SetRenderDrawColor(context, 0, 0, 0, SDL_ALPHA_OPAQUE);
        SDL_RenderDrawLine(context, ux, uy, ux + w, uy);
        SDL_RenderDrawLine(context, ux + w, uy, ux + w, uy + h);
        SDL_RenderDrawLine(context, ux + w, uy + h, ux, uy + h);
        SDL_RenderDrawLine(context, ux, uy + h, ux, uy);

        drawText(context, 18, graphDesc.name, ux + textOffset, uy + 3, 0, 0);

        context.strokeStyle = graphDesc.strokeStyle;
        context.lineWidth = 3 * scale;
        context.globalAlpha = 1;
        SDL_RenderDrawLine(context, ux + lineOffset, uy + h / 2, ux + lineWidth + lineOffset, uy + h / 2);

        i++;
    }

    //line between ends
    if (graphDescs.length >= 2) {
        let lastGraphDesc = null;
        for (let graphDesc of graphDescs) {
            if (lastGraphDesc) {
                let endVal0 = lastGraphDesc.values(rssi)[lastGraphDesc.values.length - 1]
                let endVal1 = graphDesc.values(rssi)[graphDesc.values.length - 1]

                if (endVal0 && endVal1) {
                    let mappedEndVal0 = endVal0.clone();
                    mappedEndVal0.x = mapNum(mappedEndVal0.x, lowerBound.x, upperBound.x, 0, graphWidth);
                    mappedEndVal0.y = mapNum(mappedEndVal0.y, lowerBound.y, upperBound.y, graphHeight, 0);
                    mappedEndVal0.z = mapNum(mappedEndVal0.z, lowerBound.z, upperBound.z, 0, graphWidth);

                    let mappedEndVal1 = endVal1.clone();
                    mappedEndVal1.x = mapNum(mappedEndVal1.x, lowerBound.x, upperBound.x, 0, graphWidth);
                    mappedEndVal1.y = mapNum(mappedEndVal1.y, lowerBound.y, upperBound.y, graphHeight, 0);
                    mappedEndVal1.z = mapNum(mappedEndVal1.z, lowerBound.z, upperBound.z, 0, graphWidth);
                
                    context.strokeStyle = "#666";
                    context.beginPath();
                    prepareLine3D(context, camera, viewProjMat, resolution, mappedEndVal0, mappedEndVal1);
                    context.stroke();

                    let dist = endVal1.minus(endVal0).magnitude();
                    let distText = numAsStr(dist) + "m";
                    let inBetweenVec = mappedEndVal1.minus(mappedEndVal0).divide(new Vector3(2)).add(mappedEndVal0).minus(new Vector3(0,0.05,0));
                    drawText3D(canvas, context, camera, viewProjMat, resolution, inBetweenVec, 0.05, distText, true, "#000");
                }
            }

            lastGraphDesc = graphDesc;
        }
    }

    //input
    if (setMarkedPoints && isMouseDownRN && lastMousePos) {
        let closestMarkedPointI = null;
        let closestMarkedPointZ = null;

        for (let i = 0; i < markedPoints.length; i++) {
            let markedPoint = markedPoints[i];
            let mappedMarkedPoint = markedPoint.clone();
            mappedMarkedPoint.x = mapNum(mappedMarkedPoint.x, lowerBound.x, upperBound.x, 0, graphWidth);
            mappedMarkedPoint.y = mapNum(mappedMarkedPoint.y, lowerBound.y, upperBound.y, graphHeight, 0);
            mappedMarkedPoint.z = mapNum(mappedMarkedPoint.z, lowerBound.z, upperBound.z, 0, graphWidth);
    
            let size = 0.1;

            let screenPos: Vector3 = vec3ToScreen(viewProjMat, resolution, mappedMarkedPoint);
            if (screenPos.z >= camera.nearZ) {
                let actualSize = size / screenPos.z;
                actualSize *= canvas.width;

                let markedPointScreenPos = new Vector2(screenPos.x, screenPos.y);
                let markedPointRadius = actualSize * 0.6;

                let realMousePos = new Vector2(lastMousePos.x - canvas.getBoundingClientRect().left, lastMousePos.y - canvas.getBoundingClientRect().top)
                let diffFromMouse = markedPointScreenPos.minus(realMousePos).magnitude();

                if (diffFromMouse < markedPointRadius) {
                    if (closestMarkedPointI == null) {
                        closestMarkedPointI = i;
                        closestMarkedPointZ = screenPos.z;
                    } else if (closestMarkedPointZ && screenPos.z < closestMarkedPointZ) {
                        closestMarkedPointI = i;
                        closestMarkedPointZ = screenPos.z;
                    }
                }

                //draw hitbox
                /*context.fillStyle = "#0ff"
                context.beginPath();
                context.arc(markedPointScreenPos.x, markedPointScreenPos.y, markedPointRadius, 0, 360);
                context.fill();*/
            }
        }

        if (closestMarkedPointI != null) {
            isMouseDown = false;
            let newPos = prompt(`New position for station ${closestMarkedPointI + 1}, write as "x,z"`);
            if (newPos) {
                console.log(newPos);
                let splitNewPos = newPos.split(",");
                if (splitNewPos.length == 2) {
                    let x = Number(splitNewPos[0])
                    let y = Number(splitNewPos[1])

                    if (x <= 3000 && x >= -3000) {
                        if (y <= 3000 && y >= -3000) {
                            let newMarkedPoints = [markedPoints[0], markedPoints[1], markedPoints[2]];
                            newMarkedPoints[closestMarkedPointI] = new Vector3(x,0,y);
                            setMarkedPoints(newMarkedPoints);
                        }
                    }
                }
            }
        }
    }

    /*
    context.beginPath();
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,0,0), new Vector3(1,0,0));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,0,0), new Vector3(1,1,0));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,1,0), new Vector3(0,1,0));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,1,0), new Vector3(0,0,0));

    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,0,1), new Vector3(1,0,1));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,0,1), new Vector3(1,1,1));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,1,1), new Vector3(0,1,1));
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,1,1), new Vector3(0,0,1));
    context.stroke();

    context.beginPath();
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,0,0), new Vector3(0,0,1), false);
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,0,0), new Vector3(1,0,1), false);
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(1,1,0), new Vector3(1,1,1), false);
    prepareLine3D(context, camera, viewProjMat, resolution, new Vector3(0,1,0), new Vector3(0,1,1), false);
    context.fill();
    

    context.fillStyle = "#f00";
    context.beginPath();
    prepareCircle3D(context, camera, viewProjMat, resolution, new Vector3(0.5,0.5,0.5), 180)
    context.fill();
    */

    //name
    if (widgetName.length > 0) {
        drawText(context, 24, widgetName, canvas.width / 2, 0, 0.5, 0.0);
    }

    //end
    mouseDiff.x = 0;
    mouseDiff.y = 0;
    isMouseDownRN = false;

    lastAnimationFrameId = window.requestAnimationFrame(() => {
        render(camera, canvas, context, widgetName, graphDescs, markedPoints, rssi, setMarkedPoints);
    })
}

let lastMousePos: Vector2 | null = null;

function mouseMoveListener(evt: MouseEvent) {
    let mousePos = new Vector2(evt.clientX, evt.clientY);

    if (lastMousePos) {
        mouseDiff.x += lastMousePos.x - mousePos.x;
        mouseDiff.y += lastMousePos.y - mousePos.y
    }

    lastMousePos = mousePos.clone();
}

function mouseDownListener(evt: MouseEvent) {
    if (evt.button == 0) {
        isMouseDown = true;
        isMouseDownRN = true;
    }
}

function mouseUpListener(evt: MouseEvent) {
    if (evt.button == 0) {
        isMouseDown = false;
    }
}

function wheelListener(evt: WheelEvent) {
    cameraZoom = clamp(cameraZoom + evt.deltaY / 500, 0.2, 3.2);
    evt.preventDefault();
}

export default function CanvasGraph3DWidget({ widgetName = "", graphDescs = [], markedPoints = [], setMarkedPoints, scale = 1 } : { widgetName?: string, graphDescs?: GraphDescription3[], markedPoints?: Vector3[], setMarkedPoints?: Function, scale?: number }) {
    const canvasRef = useRef(null); 
    const cameraRef = useRef(new Camera(new Vector3(0.7, 0, 5.29)));

    let [rssi, setRssi] = useState<[number, number, number]>([-60, -60, -60]);

    useEffect(() => {
        const camera = cameraRef.current;
        camera.fov = 70;

        const canvas: HTMLCanvasElement = (canvasRef.current as unknown as HTMLCanvasElement);

        canvas.addEventListener("mousemove", mouseMoveListener);
        canvas.addEventListener("mousedown", mouseDownListener);
        canvas.addEventListener("mouseup", mouseUpListener);
        canvas.addEventListener("wheel", wheelListener);

        const context = canvas.getContext("2d");

        if (!context) return () => {};
        
        updateOrbitalCamera(camera, new Vector2(0,0));
        render(camera, canvas, context, widgetName, graphDescs, markedPoints, rssi, setMarkedPoints, scale);

        return () => {
            canvas.removeEventListener("mousemove", mouseMoveListener);
            canvas.removeEventListener("mousedown", mouseDownListener);
            canvas.removeEventListener("mouseup", mouseUpListener);
            canvas.removeEventListener("wheel", wheelListener);

            if (lastAnimationFrameId) {
                window.cancelAnimationFrame(lastAnimationFrameId);
            }
        }
    })

    return (
        <div className="widget graph-widget">
            <div className="graph-widget-rssi-container">
                <div className="graph-widget-calibration">
                    1m RSSI:
                    <input type="number" placeholder="1" value={rssi[0]} onChange={(e) => {
                        setRssi([e.target.valueAsNumber, rssi[1], rssi[2]])
                    }}></input>
                    <input type="number" placeholder="2" value={rssi[1]} onChange={(e) => {
                        setRssi([rssi[0], e.target.valueAsNumber, rssi[2]])
                    }}></input>
                    <input type="number" placeholder="3" value={rssi[2]} onChange={(e) => {
                        setRssi([rssi[0], rssi[1], e.target.valueAsNumber])
                    }}></input>
                </div>
                
            </div>
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

/*
<select name="3dgraphdesc">
    {
        graphDescs.map((desc) => {
            return (
                <option value={desc.name}>{desc.name}</option>
            );
        })
    }
</select>
*/