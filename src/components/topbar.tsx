import React from "react";
import Connection from "./connection";
import { SerialConnectionStatus } from "../common/serialConnectionData";
import RadialButton from "./radialButton";

export default function TopBar({ serialConnect, serialConnectionStatus, serialClose, saveLog, downloadLog }: {serialConnect: Function, serialConnectionStatus: SerialConnectionStatus, serialClose:Function, saveLog: Function, downloadLog: Function}): React.JSX.Element {
    return (
    <div className="topbar">
        <div className="topbar-title-container">
            <span className="topbar-title">RAISE</span>
            <span className="topbar-title-separator">-</span>
            <span className="topbar-title-secondary">Dashboard</span>
        </div>
        <div className="topbar-right">
            <RadialButton onClick={downloadLog}>
                Download Log
            </RadialButton>
            <RadialButton onClick={saveLog}>
                Set Log save Location
            </RadialButton>
            <Connection serialConnect={serialConnect} serialConnectionStatus={serialConnectionStatus} serialClose={serialClose}/>
        </div>
    </div>
    )
}