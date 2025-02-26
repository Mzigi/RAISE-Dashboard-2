import React from "react";
import GraphWidget, { GraphDescription } from "./graphWidget";
import SerialConnectionData, { SerialDataGroup } from "../common/serialConnectionData";
import Graph3DWidget from "./graph3DWidget";
import CanvasGraph3DWidget, { GraphDescription3 } from "./canvasGraph3DWidget";
import { Vector3 } from "../rendering/core/model";
import { basicTriangulation, rssiToDistance } from "../common/triangulation";
import StatusWidget from "./statusWidget";
import ConsoleWidget from "./consoleWidget";

const millisIndexFunc = (serialDataGroup: SerialDataGroup): number => {
    return serialDataGroup.milliseconds / 1000;
}

export default function Dashboard({ serialData, stationPositions, sendSerial, serialLog }: { serialData: SerialDataGroup[], stationPositions: Vector3[], sendSerial: Function, serialLog: string }): React.JSX.Element {
    //temperature
    const analogTemperatureGD = new GraphDescription(serialData, serialData);
    analogTemperatureGD.name = "Analog";
    analogTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.T2};
    analogTemperatureGD.indexFunc = millisIndexFunc;

    const bmpTemperatureGD = new GraphDescription(serialData, serialData);
    bmpTemperatureGD.name = "BMP";
    bmpTemperatureGD.strokeStyle = "#ff5959"
    bmpTemperatureGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.T};
    bmpTemperatureGD.indexFunc = millisIndexFunc;
    bmpTemperatureGD.invalidFunc = (val: number) => {
        return val <= -1;
    }

    //altitude
    const gpsAltitudeGD = new GraphDescription(serialData, serialData);
    gpsAltitudeGD.name = "GPS";
    gpsAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.GPS.altitude};
    gpsAltitudeGD.indexFunc = millisIndexFunc;
    gpsAltitudeGD.invalidFunc = (val: number) => {
        return val <= -9999;
    }

    const bmpAltitudeGD = new GraphDescription(serialData, serialData);
    bmpAltitudeGD.name = "BMP";
    bmpAltitudeGD.strokeStyle = "#ff5959"
    bmpAltitudeGD.valueFunc = (serialDataGroup: SerialDataGroup) => {return serialDataGroup.ALT};
    bmpAltitudeGD.indexFunc = millisIndexFunc;
    bmpAltitudeGD.invalidFunc = (val: number) => {
        return val <= -1;
    }

    //3d description
    const test3dGD = new GraphDescription3(serialData, serialData);
    test3dGD.name = "test 3d";
    test3dGD.valueFunc = (serialDataGroup: SerialDataGroup) => {
        let txPower = 17;
        let [R1, R2, R3] = [rssiToDistance(serialDataGroup.S.S1, txPower), rssiToDistance(serialDataGroup.S.S2, txPower), rssiToDistance(serialDataGroup.S.S3, txPower)];
        let resultPos = basicTriangulation(new Vector3(0), new Vector3(-stationPositions[1].x,0), new Vector3(-stationPositions[2].x,stationPositions[2].z), R1, R2, R3);
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
        panelDescriptions.push(panelGD);
    }

    return (
    <div className="widgets-container">
        <GraphWidget graphDescriptions={[analogTemperatureGD, bmpTemperatureGD]} widgetName={"Temperature"}/>
        <GraphWidget graphDescriptions={[gpsAltitudeGD, bmpAltitudeGD]} widgetName={"Altitude"}/>
        <GraphWidget graphDescriptions={panelDescriptions} widgetName={"Solar Panels"}/>
        <CanvasGraph3DWidget widgetName="Position" graphDescs={[test3dGD]} markedPoints={stationPositions}></CanvasGraph3DWidget>
        <StatusWidget serialDataGroup={serialData[serialData.length - 1]} sendSerial={sendSerial}/>
        <ConsoleWidget serialLog={serialLog}/>
    </div>
    );
}