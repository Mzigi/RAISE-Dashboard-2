import React, { useEffect, useRef, useState } from "react";
import TopBar from "./topbar";

import { SerialContext } from "../common/serialContext";
import SerialConnectionData, { SerialConnectionStatus } from "../common/serialConnectionData";
import Dashboard from "./dashboard";
import { Vector3 } from "../rendering/core/model";

declare global {
    interface Window {
        showSaveFilePicker: (options: any) => Promise<FileSystemFileHandle>;
    }
}

var saveByteArray = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.setAttribute("style","display: none;")
    return function (data: BlobPart[], name: string) {
        var blob = new Blob(data, {type: "octet/stream"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = name;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

export default function App(): React.JSX.Element {
    let [serialData, setSerialData] = useState<SerialConnectionData>(new SerialConnectionData());
    let [serialConnectionStatus, setSerialConnectionStatus] = useState<SerialConnectionStatus>("disconnected");

    let [logHandle, setLogHandle] = useState<FileSystemWritableFileStream | null>(null);
    let [stationPositions, setStationPositions] = useState<[Vector3,Vector3,Vector3]>([new Vector3(0,0,0), new Vector3(-1000,0,0), new Vector3(-500,0,500)]);

    useEffect(() => {
        if (serialData.port && !serialData.port.connected) {
            serialData.closePort();
            setSerialConnectionStatus("disconnected")
            //console.log("disconnected 40")
        }
        if (!serialData.reader) {
            return;
        }

        let dataClone = serialData.clone();

        if (!dataClone.reader) return;

        let ignore = false;

        dataClone.reader.read().then(({value, done}) => {
            if (done) {
                dataClone.reader = undefined;
                return;
            }
            if (ignore) {
                return
            }
            
            let valueAsString = dataClone.textDecoder.decode(value)
    
            let newSerialData = dataClone.clone();
    
            newSerialData.log += valueAsString
            if (logHandle) {
                logHandle.write(valueAsString);
            }
            
            let linesToParse = dataClone.lastLine + valueAsString
            let splitLines = linesToParse.split("\n");
            newSerialData.lastLine = splitLines[splitLines.length - 1]
    
            splitLines.pop();
            for (let line of splitLines) {
                newSerialData.parseLine(line);
            }

            setSerialData(newSerialData)
        })
        

        return () => {
            ignore = true;
        }
    })

    async function serialConnect() {
        if (!navigator.serial) {
            alert("Your browser does not support serial connections. Try using Microsoft Edge.")
        }

        try {
            let port = await navigator.serial.requestPort();
            console.log(port.getInfo());

            setSerialConnectionStatus("connecting")
            //console.log("connecting 97")

            await port.open({baudRate: 9600});
            
            let newSerialData: SerialConnectionData = serialData.clone();
            newSerialData.port = port;
            newSerialData.readyRead();

            setSerialConnectionStatus("connected");
            //console.log("connected 106")
            setSerialData(newSerialData);
        } catch (error) {
            console.warn(error);
            setSerialConnectionStatus("disconnected");
            //console.log("disconnected 111")
        }
    }

    function serialClose() {
        let newSerialData: SerialConnectionData = serialData.clone();
        newSerialData.closePort();
        if (logHandle) {
            logHandle.close();
            setLogHandle(null);
        }

        setSerialConnectionStatus("disconnected")
        //console.log("disconnected 124")
        setSerialData(newSerialData)
    }

    async function saveLog() {
        if (!window.showSaveFilePicker) {
            alert("Your browser does not support writing to file handles. Try using Microsoft Edge.")
        }

        try {
            let fileHandle = await window.showSaveFilePicker({
                "suggestedName": new Date().toLocaleDateString().replaceAll(".", "_") + "-" + new Date().toLocaleTimeString().replaceAll(":","_") + "_Log.txt"
            })
            let writeable = await fileHandle.createWritable();
            writeable.write(serialData.log);
            setLogHandle(writeable);
        } catch (error) {
            console.warn(error);
        }
    }

    function sendSerial(data: string) {
        if (serialData.port && serialData.port.writable) {
            const writer = serialData.port.writable.getWriter();
            writer.write(new TextEncoder().encode(data));
            writer.releaseLock();
        } else {
            console.warn(`Serial port not available or writeable (${data})`)
        }
    }

    function downloadLog() {
        saveByteArray([serialData.log], new Date().toLocaleDateString().replaceAll(".", "_") + "-" + new Date().toLocaleTimeString().replaceAll(":","_") + "_Log.txt")
    }

    let lastKey = 0;

    (window as any)["serialData"] = serialData;

    return (<>
        <SerialContext.Provider value={serialData}>
            <TopBar serialConnect={serialConnect} serialConnectionStatus={serialConnectionStatus} serialClose={serialClose} saveLog={saveLog} downloadLog={downloadLog}/>
            <Dashboard serialData={serialData.serialData} stationPositions={stationPositions} sendSerial={sendSerial} serialLog={serialData.log}/>
        </SerialContext.Provider>
    </>);
}