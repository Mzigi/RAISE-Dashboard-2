import React from "react";
import GraphWidget, { GraphDescription } from "./graphWidget";
import SerialConnectionData, { SerialDataGroup } from "../common/serialConnectionData";
import Graph3DWidget from "./graph3DWidget";
import CanvasGraph3DWidget, { GraphDescription3 } from "./canvasGraph3DWidget";
import { Vector3 } from "../rendering/core/model";
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

export default function Dashboard({ serialData, stationPositions, sendSerial, serialLog, setStationPositions }: { serialData: SerialDataGroup[], stationPositions: Vector3[], sendSerial: Function, serialLog: string, setStationPositions: Function }): React.JSX.Element {
    //temperature
    const analogTemperatureGD = new GraphDescription(serialData, serialData);
    analogTemperatureGD.name = "Analog";
    analogTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
        return analogTemperatureCalibration2(serialDataGroup.T2);
    };
    analogTemperatureGD.indexFunc = millisIndexFunc;
    analogTemperatureGD.invalidFunc = (val: number) => {
        return val >= 40 || val <= -30;
    }

    const bmpTemperatureGD = new GraphDescription(serialData, serialData);
    bmpTemperatureGD.name = "BMP";
    bmpTemperatureGD.strokeStyle = "#ff5959"
    bmpTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.T};
    bmpTemperatureGD.indexFunc = millisIndexFunc;
    bmpTemperatureGD.invalidFunc = (val: number) => {
        return val >= 40 || val <= -30 || val == -1;
    }

    //altitude
    const gpsAltitudeGD = new GraphDescription(serialData, serialData);
    gpsAltitudeGD.name = "GPS";
    gpsAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.GPS.altitude};
    gpsAltitudeGD.indexFunc = millisIndexFunc;
    gpsAltitudeGD.invalidFunc = (val: number) => {
        return val <= -0.899 || val >= 10000;
    }

    const bmpAltitudeGD = new GraphDescription(serialData, serialData);
    bmpAltitudeGD.name = "BMP";
    bmpAltitudeGD.strokeStyle = "#ff5959"
    bmpAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.ALT};
    bmpAltitudeGD.indexFunc = millisIndexFunc;
    bmpAltitudeGD.invalidFunc = (val: number) => {
        return val <= -1 || val >= 10000;
    }

    //3d description
    const test3dGD = new GraphDescription3(serialData, serialData);
    test3dGD.name = "test 3d";
    test3dGD.valueFunc = (serialDataGroup: SerialDataGroup, rssi: [number,number,number]) => {
        let txPower = 17;
        let [R1, R2, R3] = [rssiToDistance(serialDataGroup.S.S1, txPower, rssi[0]), rssiToDistance(serialDataGroup.S.S2, txPower, rssi[1]), rssiToDistance(serialDataGroup.S.S3, txPower, rssi[2])];
        let resultPos = basicTriangulation(new Vector3(0), new Vector3(-stationPositions[1].x,0), new Vector3(-stationPositions[2].x,stationPositions[2].z), R1, R2, R3);
        resultPos.y = serialDataGroup.ALT - serialDataGroup.baseALT;
        return resultPos;
    }
    test3dGD.indexFunc = millisIndexFunc;

    //solar panels
    let panelDescriptions = []
    for (let i = 0; i < 4; i++) {
        const panelGD = new GraphDescription(serialData, serialData);
        panelGD.name = "Panel " + i;
        panelGD.strokeStyle = [panelGD.strokeStyle, "#ff5959", "#1f8f3d", "#c2b611"][i];
        panelGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.P.get(i)};
        panelGD.indexFunc = millisIndexFunc;
        panelGD.invalidFunc = (val: number) => {
            return val >= 1024;
        }
        panelDescriptions.push(panelGD);
    }

    return (
    <div className="widgets-container">
        <div className="widgets-row">
            <GraphWidget graphDescriptions={[analogTemperatureGD, bmpTemperatureGD]} widgetName={"Temperature"}/>
            <GraphWidget graphDescriptions={[gpsAltitudeGD, bmpAltitudeGD]} widgetName={"Altitude"}/>
            <GraphWidget graphDescriptions={panelDescriptions} widgetName={"Solar Panels"}/>
        </div>
        <div className="widgets-row">
            <CanvasGraph3DWidget widgetName="Position" graphDescs={[test3dGD]} markedPoints={stationPositions} setMarkedPoints={setStationPositions}></CanvasGraph3DWidget>
            <StatusWidget serialDataGroup={serialData[serialData.length - 1]} sendSerial={sendSerial}/>
            <ConsoleWidget serialLog={serialLog}/>
        </div>
    </div>
    );
}