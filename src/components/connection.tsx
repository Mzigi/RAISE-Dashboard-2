import React, { useContext } from "react";
import { SerialContext } from "../common/serialContext";
import SerialConnectionData, { SerialConnectionStatus } from "../common/serialConnectionData";
import RadialButton from "./radialButton";

let connectedIcon = "check_box"
let disconnectedIcon = "check_box_outline_blank"

export default function Connection({ serialConnect, serialConnectionStatus, serialClose }: {serialConnect: Function, serialConnectionStatus: SerialConnectionStatus, serialClose: Function}): React.JSX.Element {
    let serialDataContext: SerialConnectionData = useContext(SerialContext);

    async function handleClick() {
        if (serialConnectionStatus == "disconnected") {
            serialConnect();
        } else {
            serialClose();
        }
    }

    let buttonText = "";
    let isConnecting = serialConnectionStatus == "connecting";

    switch (serialConnectionStatus) {
        case "connected":
            buttonText = "Disconnect"
            break
        case "connecting":
            buttonText = "..."
            break
        case "disconnected":
            buttonText = "Connect"
            break
    }

    return (
        isConnecting ? 
        (<>
            <span style={{color: "white"}}>Connecting...</span>
        </>)
        : 
        (
            <RadialButton className={`topbar-connection ${serialConnectionStatus == "connected" ? "topbar-connection-disconnect" : ""}`} onClick={handleClick}>
                <span className="topbar-connection-text">{buttonText}</span>
            </RadialButton>
        )
    )
}