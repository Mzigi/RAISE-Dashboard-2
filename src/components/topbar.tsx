import React from "react";
import Connection from "./connection";
import { SerialConnectionStatus } from "../common/serialConnectionData";
import RadialButton from "./radialButton";

export default function TopBar({ serialConnect, serialConnectionStatus, serialClose, saveLog, downloadLog, parseLines }: {serialConnect: Function, serialConnectionStatus: SerialConnectionStatus, serialClose:Function, saveLog: Function, downloadLog: Function, parseLines: Function}): React.JSX.Element {
    return (
    <div className="topbar">
        <div className="topbar-title-container">
            <span className="topbar-title">RAISE</span>
            <span className="topbar-title-separator">-</span>
            <span className="topbar-title-secondary">Dashboard</span>
        </div>
        <div className="topbar-right">
            <RadialButton className="no-padding">
                <label htmlFor="import-log" style={{padding: "0 1em 0 1em"}}>Import Log</label><input type="file" id="import-log" onChange={
                    (e: React.ChangeEvent<HTMLInputElement>) => {
                        let input = e.target;
                        if (input.files && input.files.length >= 0) {
                            const fileReader = new FileReader();
                            fileReader.addEventListener("load", (e) => {
                                let result = fileReader.result;
                                if (result) {
                                    parseLines(result.toString());
                                }
                            });
                            fileReader.readAsText(input.files[0]);
                        }
                    }
                }/>
            </RadialButton>
            <RadialButton onClick={downloadLog}>
                Download Log
            </RadialButton>
            {serialConnectionStatus != "connected" ? <RadialButton onClick={saveLog}>
                Set Log save Location
            </RadialButton> : null}
            <Connection serialConnect={serialConnect} serialConnectionStatus={serialConnectionStatus} serialClose={serialClose}/>
        </div>
    </div>
    )
}