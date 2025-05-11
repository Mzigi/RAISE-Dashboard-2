import React from "react";
import GraphWidget, { GraphDescription } from "./graphWidget";
import SerialConnectionData, { SerialDataGroup } from "../common/serialConnectionData";
import Graph3DWidget from "./graph3DWidget";
import CanvasGraph3DWidget, { GraphDescription3 } from "./canvasGraph3DWidget";
import { Vector2, Vector3 } from "../rendering/core/model";
import { basicTriangulation, rssiToDistance } from "../common/triangulation";
import StatusWidget from "./statusWidget";
import ConsoleWidget from "./consoleWidget";

declare global {
    interface Window {
        stationPositions: [Vector3, Vector3, Vector3];
    }
}

const millisIndexFunc = (serialDataGroup: SerialDataGroup): number => {
    return serialDataGroup.milliseconds / 1000;
}

//Based on these values
//978 = 30
//987 = 24.25
//995 = 18.19
function analogTemperatureCalibration1(x: number): number {
    return -0.6935*x + 708.4477;
}

function analogTemperatureCalibration2(x: number): number {
    return -0.05*x + 63.62;
}

function measure(lat1: number, lon1: number, lat2: number, lon2: number){  // generally used geo measurement function
    let R = 6378.137; // Radius of earth in KM
    let dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    let dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let d = R * c;
    return d * 1000; // meters
}

export default function Dashboard({ serialData, stationPositions, sendSerial, serialLog, setStationPositions, corruptedSerialData }: { serialData: SerialDataGroup[], stationPositions: Vector3[], sendSerial: Function, serialLog: string, setStationPositions: Function, corruptedSerialData: SerialDataGroup[] }): React.JSX.Element {
    //temperature
    const analogTemperatureGD = new GraphDescription(serialData, serialData);
    analogTemperatureGD.xSuffix = "s";
    analogTemperatureGD.ySuffix = "°C";
    analogTemperatureGD.name = "Analog";
    analogTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
        return analogTemperatureCalibration2(serialDataGroup.T2);
    };
    analogTemperatureGD.indexFunc = millisIndexFunc;
    analogTemperatureGD.invalidFunc = (val: number) => {
        return val >= 40 || val <= -30;
    }

    const bmpTemperatureGD = new GraphDescription(serialData, serialData);
    bmpTemperatureGD.xSuffix = "s";
    bmpTemperatureGD.ySuffix = "°C";
    bmpTemperatureGD.name = "BMP";
    bmpTemperatureGD.strokeStyle = "#ff5959"; //"rgba(255, 89, 89, 0.5)"
    //bmpTemperatureGD.marker = "circle";
    bmpTemperatureGD.graphStyle = "line";
    bmpTemperatureGD.markerStyle = "#ff5959";
    bmpTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.T};
    bmpTemperatureGD.indexFunc = millisIndexFunc;
    bmpTemperatureGD.invalidFunc = (val: number) => {
        return val >= 40 || val <= -30 || val == -1;
    }

    //latitude and longitude
    const gpsLatitudeGD = new GraphDescription(serialData, serialData);
    gpsLatitudeGD.name = "Position";
    gpsLatitudeGD.xSuffix = "m";
    gpsLatitudeGD.ySuffix = "m";
    gpsLatitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
        return serialDataGroup.GPS.latitude;
    }
    gpsLatitudeGD.indexFunc = (serialDataGroup: SerialDataGroup) => {
        if (serialDataGroup.GPS.longitude <= 15) {
            return 0;
        }
        return serialDataGroup.GPS.longitude;
    }
    gpsLatitudeGD.invalidFunc = (val: number) => {
        return val >= 70 || val <= 50;
    }


    //altitude
    const gpsAltitudeGD = new GraphDescription(serialData, serialData);
    gpsAltitudeGD.name = "GPS";
    gpsAltitudeGD.xSuffix = "s";
    gpsAltitudeGD.ySuffix = "m";
    gpsAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.GPS.altitude};
    gpsAltitudeGD.indexFunc = millisIndexFunc;
    gpsAltitudeGD.invalidFunc = (val: number) => {
        return val <= -0.899 || val >= 10000 || isNaN(val);
    }
    
    const bmpAltitudeGD = new GraphDescription(serialData, serialData);
    bmpAltitudeGD.name = "BMP";
    bmpAltitudeGD.xSuffix = "s";
    bmpAltitudeGD.ySuffix = "m";
    bmpAltitudeGD.strokeStyle = "#ff5959";
    //bmpAltitudeGD.marker = "circle";
    bmpAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.ALT - serialDataGroup.baseALT};
    bmpAltitudeGD.indexFunc = millisIndexFunc;
    bmpAltitudeGD.invalidFunc = (val: number) => {
        return val <= -1 || val >= 10000 || isNaN(val) || val == 0;
    }

    const bmpPressureGD = new GraphDescription(serialData, serialData);
    bmpPressureGD.name = "BMP";
    bmpPressureGD.xSuffix = "s";
    bmpPressureGD.ySuffix = "hPa";
    bmpPressureGD.strokeStyle = "#ff5959"
    bmpPressureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.PRS};
    bmpPressureGD.indexFunc = millisIndexFunc;
    bmpPressureGD.invalidFunc = (val: number) => {
        return val < 300 || val > 1100 || isNaN(val) || val == 0;
    }

    //derived
    let lastAltitude: number | undefined = undefined;
    let lastI: number = 0;

    const bmpAltitudeDerivedGD = new GraphDescription(serialData, serialData);
    bmpAltitudeDerivedGD.name = "BMP";
    bmpAltitudeDerivedGD.strokeStyle = "#ff5959"
    bmpAltitudeDerivedGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
        let toReturn = -96548

        if (lastAltitude) {
            toReturn = (serialDataGroup.ALT - lastAltitude) / (serialDataGroup.milliseconds / 1000 - lastI);
        }

        if (!(serialDataGroup.ALT <= -1 || serialDataGroup.ALT >= 10000 || isNaN(serialDataGroup.ALT) || serialDataGroup.ALT == 0)) {
            lastAltitude = serialDataGroup.ALT
            lastI = serialDataGroup.milliseconds / 1000
        } else {
            toReturn = -96548
        }
        
        return toReturn
    };
    bmpAltitudeDerivedGD.indexFunc = millisIndexFunc;
    bmpAltitudeDerivedGD.invalidFunc = (val: number) => {
        return val == -96548;
    }

    //3d description
    const test3dGD = new GraphDescription3(serialData, serialData);
    test3dGD.name = "Triangulation";
    test3dGD.valueFunc = (serialDataGroup: SerialDataGroup, rssi: [number,number,number]) => {
        let txPower = 17;
        let [R1, R2, R3] = [rssiToDistance(serialDataGroup.S.S1, txPower, rssi[0]), rssiToDistance(serialDataGroup.S.S2, txPower, rssi[1]), rssiToDistance(serialDataGroup.S.S3, txPower, rssi[2])];
        let resultPos = basicTriangulation(new Vector3(0), new Vector3(-stationPositions[1].x,0), new Vector3(-stationPositions[2].x,stationPositions[2].z), R1, R2, R3);
        resultPos.y = serialDataGroup.ALT - serialDataGroup.baseALT;
        return resultPos;
    }
    test3dGD.indexFunc = millisIndexFunc;
    test3dGD.invalidFunc = (val: Vector3) => {
        return isNaN(val.x) || isNaN(val.y) || isNaN(val.z) || val.x <= -3000 || val.x >= 3000 || val.z <= -3000 || val.z >= 3000;
    }

    const gps3dGD = new GraphDescription3(serialData, serialData);
    gps3dGD.name = "GPS";
    gps3dGD.strokeStyle = "#f00"
    gps3dGD.valueFunc = (serialDataGroup: SerialDataGroup, rssi: [number,number,number]) => {
        let zDist = measure(serialDataGroup.GPS.latitude, serialDataGroup.baseLONGITUDE, serialDataGroup.baseLATITUDE, serialDataGroup.baseLONGITUDE);
        let xDist = -measure(serialDataGroup.baseLATITUDE, serialDataGroup.GPS.longitude, serialDataGroup.baseLATITUDE, serialDataGroup.baseLONGITUDE);

        let resultPos = new Vector3(xDist, 0, zDist)
        resultPos.y = serialDataGroup.ALT - serialDataGroup.baseALT;
        return resultPos;
    }
    gps3dGD.indexFunc = millisIndexFunc;
    gps3dGD.invalidFunc = (val: Vector3) => {
        return isNaN(val.x) || isNaN(val.y) || isNaN(val.z) || val.x <= -3000 || val.x >= 3000 || val.z <= -3000 || val.z >= 3000;
        //return false
    }

    let validGPSPos: [number,Vector3][] = [];
    for (let group of serialData) {
        let zDist = measure(group.GPS.latitude, group.baseLONGITUDE, group.baseLATITUDE, group.baseLONGITUDE);
        let xDist = -measure(group.baseLATITUDE, group.GPS.longitude, group.baseLATITUDE, group.baseLONGITUDE);

        let val = new Vector3(xDist, 0, zDist)
        val.y = group.ALT - group.baseALT;
        if (!(isNaN(val.x) || isNaN(val.y) || isNaN(val.z) || val.x <= -3000 || val.x >= 3000 || val.z <= -3000 || val.z >= 3000)) {
            validGPSPos.push([group.milliseconds, val]);
        }
    }
    console.log(validGPSPos);

    const estGPS3dGD = new GraphDescription3(serialData, serialData);
    estGPS3dGD.name = "Estimated GPS";
    estGPS3dGD.strokeStyle = "#00f";
    estGPS3dGD.indexFunc = millisIndexFunc;
    estGPS3dGD.valueFunc = (serialDataGroup: SerialDataGroup, rssi: [number,number,number]) => {
        let ms = serialDataGroup.milliseconds;
        let altitude = serialDataGroup.ALT - serialDataGroup.baseALT;
        if (altitude <= -1 || altitude >= 10000 || isNaN(altitude) || altitude == 0) {
            return new Vector3(-9999);
        }

        //find gps position based on ms
        let gpsPos = null;
        let nextgpsPos = null;
        let msPrev = null;
        let msNext = null;

        let gpsI = 0;
        while (!gpsPos || !nextgpsPos) {
            let val = validGPSPos[gpsI][1]
            if (ms >= validGPSPos[gpsI][0] && validGPSPos[gpsI + 1] && ms <= validGPSPos[gpsI + 1][0] && !(isNaN(val.x) || isNaN(val.y) || isNaN(val.z) || val.x <= -3000 || val.x >= 3000 || val.z <= -3000 || val.z >= 3000)) {
                if (!gpsPos) {
                    msPrev = validGPSPos[gpsI][0]
                    gpsPos = val;
                } else {
                    msNext = validGPSPos[gpsI][0]
                    nextgpsPos = val;
                }
            }

            gpsI++;
            if (gpsI >= validGPSPos.length) {
                break;
            }
        }

        //interpolate gps positions
        if (gpsPos && nextgpsPos && msNext != null && msPrev != null) {
            let maxMsDiff = msNext - msPrev;
            let msDiff = ms - msPrev;
            console.log("a")
            console.log(maxMsDiff)
            console.log(msDiff)
            console.log(msDiff / maxMsDiff)

            let diffVec = nextgpsPos.minus(gpsPos);
            diffVec = diffVec.multiply(new Vector3(msDiff / maxMsDiff));

            let resultVec = gpsPos.add(diffVec);
            resultVec.y = altitude;

            return resultVec;
        }
        console.log(gpsPos, nextgpsPos, msNext, msPrev);

        if (!gpsPos || !nextgpsPos) {
            return new Vector3(-9999);
        }

        console.error("what")
        return new Vector3(-9999);
    }
    estGPS3dGD.invalidFunc = (val: Vector3) => {
        return isNaN(val.x) || isNaN(val.y) || isNaN(val.z) || val.x <= -3000 || val.x >= 3000 || val.z <= -3000 || val.z >= 3000;
        //return false
    }

    //missing data
    let missingPoints: number[] = [];

    let largestI = 0;
    let lowestI = 10000000;
    for (let serialDataPoint of serialData) {
        if (serialDataPoint.I > largestI && serialDataPoint.I <= 99999) {
            largestI = serialDataPoint.I;
            if (serialDataPoint.I < lowestI) {
                lowestI = serialDataPoint.I
            }
        }
    }

    console.log(largestI - lowestI);
    let totalICount = 0;
    for (let i = lowestI; i <= largestI; i++) {
        let foundPoint = false;
        let pointCorrupt = false;
        for (let serialDataPoint of serialData) {
            if (i == serialDataPoint.I) {
                foundPoint = true;
                if (serialDataPoint.ALT - serialDataPoint.baseALT <= -10 && serialDataPoint.ALT - serialDataPoint.baseALT >= 2000) {
                    pointCorrupt = true;
                }
            }
        }

        if (!foundPoint || pointCorrupt) {
            missingPoints.push(i);
        } else {
            totalICount++;
        }
    }
    console.log(totalICount);

    const missingDataGD = new GraphDescription(missingPoints, missingPoints);
    missingDataGD.name = "Missing Data";
    missingDataGD.xSuffix = "s";
    missingDataGD.ySuffix = "";
    missingDataGD.strokeStyle = "rgba(0,0,0,0.5)";
    missingDataGD.maxMinY = 23
    //missingDataGD.maxMinX = 0;
    missingDataGD.graphStyle = "bar";
    missingDataGD.hasLabel = false;
    missingDataGD.widthPercentage = 0.52;
    missingDataGD.valueFunc = (num: number) => {
        return 23.5;
    };
    missingDataGD.indexFunc = (num: number) => {
        return num * 0.5 - lowestI * 0.5;
    };
    missingDataGD.invalidFunc = (val: number) => {
        return val == 0;
    }
    

    //solar panels
    let panelDescriptions = []
    for (let i = 0; i < 4; i++) {
        const panelGD = new GraphDescription(serialData, serialData);
        panelGD.xSuffix = "s";
        panelGD.ySuffix = "V";
        panelGD.maxMinY = 0;
        panelGD.name = "Panel " + (i + 1);
        panelGD.marker = "circle";
        panelGD.strokeStyle = [panelGD.strokeStyle, "#ff5959", "#1f8f3d", "#c2b611"][i];
        panelGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
            if (serialDataGroup.P.get(i) >= 1023) {
                return -999;
            }
            return serialDataGroup.P.get(i) * 5 / 1023
        };
        panelGD.indexFunc = millisIndexFunc;
        panelGD.invalidFunc = (val: number) => {
            return val <= -1;
        }
        panelDescriptions.push(panelGD);
    }

    const barChartTest = new GraphDescription([100,200,300,400,500], [500,400,200,400,800]);
    barChartTest.graphStyle = "bar";

    const joGrafGD = new GraphDescription([22.1,22.5,23.2,23.9,24.1,24.8,24.9],[37.5, 37.4,37.3,37.0,36.9,36.5,36.4]);
    joGrafGD.marker = "circle";
    joGrafGD.markerSize = 6;
    //joGrafGD.markerStyle = "rgb(255,89,89)";
    joGrafGD.strokeStyle = "#00f";
    joGrafGD.name = "K";
    joGrafGD.xSuffix = "°C";
    joGrafGD.ySuffix = "%";

    let indices = []
    for (let i = 0; i < 100; i++) {
        indices.push(i / 10);
    }

    const funcGraphGD = new GraphDescription(indices, indices);
    funcGraphGD.valueFunc = (val: any) => {
        return -2*Math.pow(val,3) + 9*val*val - 4;
    }

    return (
    <div className="widgets-container">
        <div className="widgets-row">
            <GraphWidget graphDescriptions={[analogTemperatureGD, bmpTemperatureGD]} widgetName={"Temperature"}/>
            <GraphWidget graphDescriptions={[gpsAltitudeGD, bmpAltitudeGD]} widgetName={"Altitude"}/>
            <GraphWidget graphDescriptions={panelDescriptions} yAxisLineCount={6} widgetName={"Solar Panels"}/>
        </div>
        <div className="widgets-row">
            <CanvasGraph3DWidget widgetName="Position" graphDescs={[gps3dGD]} markedPoints={stationPositions} setMarkedPoints={setStationPositions}></CanvasGraph3DWidget>
            <StatusWidget serialDataGroup={serialData[serialData.length - 1]} sendSerial={sendSerial}/>
            <ConsoleWidget serialLog={serialLog}/>
        </div>
        <div className="widgets-row">
            <GraphWidget widgetName="Pressure" graphDescriptions={[bmpPressureGD]} leftPadding={100}/>
            <GraphWidget widgetName="Missing Data" graphDescriptions={[missingDataGD]} yAxisVisible={false} yGridVisible={false} leftPadding={20} />
            <GraphWidget widgetName="Missing Data" graphDescriptions={[analogTemperatureGD, bmpTemperatureGD, missingDataGD]} scale={1}/>
        </div>
        <span className="title">Test graphs (not actual data)</span>
        <div className="widgets-row">
            <GraphWidget widgetName="Bar test" padding={48} xGridVisible={false} graphDescriptions={[barChartTest]}/>
            <GraphWidget widgetName="Temperatur vs Relativ Fuktighet" xAxisLineCount={5} yAxisLineCount={5} graphDescriptions={[joGrafGD]}/>
            <GraphWidget widgetName="🔵" graphDescriptions={[funcGraphGD]}/>
        </div>
    </div>
    );
}