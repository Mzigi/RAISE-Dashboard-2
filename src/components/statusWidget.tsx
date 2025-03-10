import React from "react";
import RadialButton from "./radialButton";
import { SerialDataGroup } from "../common/serialConnectionData";

function pad(num: number, size: number) {
    let numStr = num.toString();
    while (numStr.length < size) numStr = "0" + numStr;
    return numStr;
}

export default function StatusWidget({ serialDataGroup, sendSerial }: {serialDataGroup: SerialDataGroup , sendSerial: Function}): React.JSX.Element {
    if (!serialDataGroup) {
        serialDataGroup = new SerialDataGroup();
    }

    return (
        <div className="widget status">
            <div className="status-side status-left">
                <span className="title">Request</span>
                <ul className="status-button-content">
                    <li>
                        <RadialButton onClick={() => {sendSerial("open\n")}}>Open</RadialButton>
                    </li>
                    <li>
                        <RadialButton onClick={() => {sendSerial("close\n")}}>Close</RadialButton>
                    </li>
                </ul>
            </div>
            <div className="status-divider"></div>
            <div className="status-side status-right">
                <span className="title">Raw Info</span>
                <ul className="status-content">
                    <li>Tick: {serialDataGroup.I}</li>
                    <li>Seconds: {serialDataGroup.milliseconds / 1000}</li>
                    <li>BMP Temperature: {serialDataGroup.T}</li>
                    <li>Analog Temperature: {serialDataGroup.T2}</li>
                    <li>Pressure: {serialDataGroup.PRS}</li>
                    <li>BMP Altitude: {serialDataGroup.ALT}</li>
                    <li>Ping: {serialDataGroup.PING}</li>
                    <li>Open: {serialDataGroup.OPN ? "true": "false"}</li>
                    <li>RSSI: {serialDataGroup.S.S0},{serialDataGroup.S.S1},{serialDataGroup.S.S2},{serialDataGroup.S.S3}</li>
                    <li>Panels: {serialDataGroup.P.P0},{serialDataGroup.P.P1},{serialDataGroup.P.P2},{serialDataGroup.P.P3}</li>
                    <li>GPS Date: {serialDataGroup.GPS.day}/{serialDataGroup.GPS.month}/{serialDataGroup.GPS.year}</li>
                    <li>GPS Time: {pad(serialDataGroup.GPS.hour,2)}:{pad(serialDataGroup.GPS.minute,2)}:{pad(serialDataGroup.GPS.second,2)}</li>
                    <li>GPS Position: {serialDataGroup.GPS.latitude}, {serialDataGroup.GPS.longitude}</li>
                    <li>GPS Altitude: {serialDataGroup.GPS.altitude}</li>
                    <li>Has BMP: {serialDataGroup.BMP ? "true": "false"}</li>
                </ul>
            </div>
        </div>
    )
}