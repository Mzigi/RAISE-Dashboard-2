import { Vector2 } from "../rendering/core/model";

export type SerialConnectionStatus = "connected" | "connecting" | "disconnected"

/*
I 5 3001
T=-1.00
T2=379
PRS=-1.00
ALT=-1.00
PING=0
OPN=0
S=0,0,0,0
P=365,355,356,386
GPS=0,0,30,0,0,0,-9999.90,-9999.90,-9999.90
BMP=0*/

export class RSSIDataGroup {
    S0: number = -9999;
    S1: number = -9999;
    S2: number = -9999;
    S3: number = -9999;

    fill(v0: number, v1: number, v2: number, v3: number): RSSIDataGroup {
        this.S0 = v0;
        this.S1 = v1;
        this.S2 = v2;
        this.S3 = v3;

        return this
    }
}

export class PanelDataGroup {
    P0: number = -9999;
    P1: number = -9999;
    P2: number = -9999;
    P3: number = -9999;

    fill(v0: number, v1: number, v2: number, v3: number): PanelDataGroup {
        this.P0 = v0;
        this.P1 = v1;
        this.P2 = v2;
        this.P3 = v3;

        return this
    }

    get(i: number): number {
        return [this.P0, this.P1, this.P2, this.P3][i];
    }
}

export class GPSDataGroup {
    day: number = 0;
    month: number = 0;
    year: number = 1970;

    hour: number = 0;
    minute: number = 0;
    second: number = 0;

    latitude: number = 0;
    longitude: number = 0;
    altitude: number = 0;

    fill(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number): GPSDataGroup {
        this.day = v0;
        this.month = v1;
        this.year = v2 + 1970;
        
        this.hour = v3;
        this.minute = v4;
        this.second = v5;

        this.latitude = v6 / 10000;
        this.longitude = v7 / 10000;
        this.altitude = v8 / 10000;

        return this
    }
}

export class SerialDataGroup {
    [key: string]: number | boolean | RSSIDataGroup | PanelDataGroup | GPSDataGroup;
    I: number = -9999; //index
    milliseconds: number = -9999;
    T: number = -9999; //temperature
    T2: number = -9999; //analog temperature
    PRS: number = -9999; //pressure
    ALT: number = -9999; //altitude
    PING: number = -9999; //ping
    OPN: boolean = false; //open
    S: RSSIDataGroup = new RSSIDataGroup();
    P: PanelDataGroup = new PanelDataGroup();
    GPS: GPSDataGroup = new GPSDataGroup();
    BMP: boolean = false; //has bmp

    baseALT: number = 0;

    baseLATITUDE: number = 0;
    baseLONGITUDE: number = 0;
    baseGPSALT: number = 0;

    markForDeletion: boolean = false;
}


export default class SerialConnectionData {
    log: string = "";
    port?: SerialPort;
    reader?: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>>;
    textDecoder: TextDecoder = new TextDecoder();
    lastLine: string = "";

    serialData: SerialDataGroup[] = [];
    incompleteGroup?: SerialDataGroup = undefined;

    altitudeBaseHeight?: number = undefined;

    baseLATITUDE?: number = undefined;
    baseLONGITUDE?: number = undefined;
    baseGPSALT?: number = undefined;

    baseMillis?: number = undefined;

    readyRead() {
        if (!this.port || !this.port.readable) {
            console.error("Port not readable");
            return;
        }

        this.reader = this.port.readable.getReader();
    }

    closePort() {
        if (this.reader) {
            if (this.port?.connected) {
                this.reader.cancel();
                this.reader.releaseLock();
            }
            this.reader = undefined;
        }

        if (this.port) {
            if (this.port.connected) {
                this.port.close();
            }
            this.port.forget();
            this.port = undefined;
        }
    }

    getCurrentGroup(): SerialDataGroup | undefined {
        //return this.serialData[this.serialData.length - 1];
        return this.incompleteGroup
    }
    
    getLastGroup(): SerialDataGroup | undefined {
        return this.serialData[this.serialData.length - 1];
    }

    getLineValues(line: string): [string, number] {
        let parts = line.split("=")
        return [parts[0], Number(parts[1])]
    }

    getLineValuesRaw(line: string): [string, string] {
        let parts = line.split("=")
        return [parts[0], parts[1]]
    }

    getValuesFor(name: string, maxI: number) {
        let values = []

        for (let i = 0; i < Math.min(maxI, this.serialData.length - 1); i++) {
            values.push(this.serialData[i][name])
        }

        return values;
    }

    parseLine(line: string) {
        if (line.length <= 1) return;
        if (line.startsWith("//")) return;
        if (line.startsWith("/*")) return;
        if (line.startsWith("*/")) return;
        if (line.includes("ovf")) {
            if (this.incompleteGroup) {
                this.incompleteGroup.markForDeletion = true;
            }
            return;
        }

        try {
            let currentGroup = this.getCurrentGroup()
            if (line.startsWith("I")) { //Index info
                if (currentGroup && !currentGroup.markForDeletion) {
                    this.serialData.push(currentGroup)
                }
                currentGroup = new SerialDataGroup();
                this.incompleteGroup = currentGroup;

                let [_name, index, millis] = line.split(" ");
                currentGroup.I = Number(index);
                currentGroup.milliseconds = Number(millis);

                if (!this.baseMillis) {
                    this.baseMillis = currentGroup.milliseconds;
                }
                currentGroup.milliseconds -= this.baseMillis;

                if (this.serialData.length >= 2) {
                    let preLastGroup = this.serialData[this.serialData.length - 2];
                    let lastGroup = this.getLastGroup();

                    if (lastGroup && preLastGroup) {
                        if (preLastGroup.milliseconds && preLastGroup.milliseconds >= lastGroup.milliseconds && preLastGroup.milliseconds >= Number(millis) || preLastGroup.milliseconds >= 24 * 60 * 60 * 1000) {
                            console.warn(`Removed corrupted group at I ${index}`)
                            this.serialData.splice(this.serialData.length - 2, 1);
                        }
                        if (lastGroup.milliseconds <= preLastGroup.milliseconds) {
                            console.warn(`Removed corrupted group at I ${index}`)
                            this.serialData.splice(this.serialData.length - 1, 1);
                        }
                    }
                }
            } else if (currentGroup) {
                let lineName = line.split("=")[0];

                if (["T","T2","PRS","ALT","PING"].includes(lineName)) {
                    let [name, value] = this.getLineValues(line);
                    if (currentGroup[name]) {
                        currentGroup[name] = value;
                    }

                    if (lineName == "ALT") {
                        if (value > 0 && this.altitudeBaseHeight == undefined) {
                            this.altitudeBaseHeight = value;
                        }

                        if (this.altitudeBaseHeight) {
                            currentGroup.baseALT = this.altitudeBaseHeight;
                        }
                    }
                } else if (["OPN","BMP"].includes(lineName)) {
                    let [name, value] = this.getLineValues(line);
                    //console.log(`${lineName} = ${value}`);
                    if (currentGroup[name] != undefined) {
                        currentGroup[name] = value == 1;
                        //console.log(currentGroup[name]);
                    }
                } else {
                    switch (lineName) {
                        case "S": {
                            let [_name, value] = this.getLineValuesRaw(line);
                            let values: [number, number, number, number] = value.split(",").map((val) => {
                                return Number(val)
                            }) as [number, number, number, number];

                            currentGroup.S = (new RSSIDataGroup()).fill(...values);
                            break;
                        }
                        case "P": {
                            let [_name, value] = this.getLineValuesRaw(line);
                            let values: [number, number, number, number] = value.split(",").map((val) => {
                                return Number(val)
                            }) as [number, number, number, number];

                            currentGroup.P = (new PanelDataGroup()).fill(...values);
                            break;
                        }
                        case "GPS": {
                            let [_name, value] = this.getLineValuesRaw(line);
                            let values: [number, number, number, number, number, number, number, number, number] = value.split(",").map((val) => {
                                return Number(val)
                            }) as [number, number, number, number, number, number, number, number, number];

                            currentGroup.GPS = (new GPSDataGroup()).fill(...values);

                            if (!this.baseLONGITUDE && currentGroup.GPS.longitude > 0) {
                                this.baseLONGITUDE = currentGroup.GPS.longitude;
                            }
                            if (!this.baseLATITUDE && currentGroup.GPS.latitude > 0) {
                                this.baseLATITUDE = currentGroup.GPS.latitude;
                            }
                            if (!this.baseGPSALT && currentGroup.GPS.altitude > -100) {
                                this.baseGPSALT = currentGroup.GPS.altitude;
                            }

                            if (this.baseLONGITUDE) {
                                currentGroup.baseLONGITUDE = this.baseLONGITUDE;
                            }
                            if (this.baseLATITUDE) {
                                currentGroup.baseLATITUDE = this.baseLATITUDE;
                            }
                            if (this.baseGPSALT) {
                                currentGroup.baseGPSALT = this.baseGPSALT;
                            }

                            break;
                        }
                        default: {
                            console.warn(`unknown value: ${lineName}`)
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("ERROR WHILE PARSING LINE: " + error)
        }
    }

    clone(): SerialConnectionData {
        let clone = new SerialConnectionData();
        clone.log = this.log;
        clone.port = this.port;
        clone.reader = this.reader;
        clone.textDecoder = this.textDecoder;
        clone.lastLine = this.lastLine;
        clone.serialData = this.serialData;
        clone.incompleteGroup = this.incompleteGroup;

        return clone;
    }
}