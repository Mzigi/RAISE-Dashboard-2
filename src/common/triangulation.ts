/* COORDINATES INFO
X = WEST
Y = UP
Z = NORTH
*/

import { Vector3 } from "../rendering/core/model";

const RSSI_START = -60;

export function rssiToDistance(RSSI: number, txPower: number) {
    let PL0: number = txPower - RSSI_START;
    return Math.pow(10, ((txPower - RSSI - PL0)) / (10 * 2));
}

export function basicTriangulation(pos0: Vector3, pos1: Vector3, pos2: Vector3, radius0: number, radius1: number, radius2: number): Vector3 {
    let vx = pos2.x;
    let vy = pos2.y;
    let u = pos1.x;

    let R1 = radius0;
    let R2 = radius1;
    let R3 = radius2;

    let x = (R1*R1 - R2*R2 + u*u)/(2*u);
    let y = (R1*R1 - R3*R3 + vx*vx + vy*vy - 2*vx*x)/(2*vy);
    let z = Math.pow(Math.abs(R1*R1 - x*x - y*y),0.5);

    return new Vector3(-x,z,y);
}