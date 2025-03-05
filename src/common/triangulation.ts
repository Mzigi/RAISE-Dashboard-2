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

export function snufkinTriangulation(radius0: number, radius1: number, radius2: number): Vector3 {
    /*z1 = 0
    z2 = 4
    x1 = 0
    y1 = 0
    y2 = 0
    x2 = 5
    x3 = 4
    y3 = -3
    z3 = 1
    x4 = -3
    y4 = 5
    z4 = 2
    d12 = math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
    d13 = math.sqrt(x3**2 + y3**2 + (z3-z1)**2)
    d23 = math.sqrt((x3-x2)**2 + (y3-y2)**2 + (z3-z2)**2)
    d34 = math.sqrt((x4-x3)**2 + (y4-y3)**2 +(z4-z3)**2)

    d12 = d12**2 - (z2-z1)**2 
    d12 = math.sqrt(d12)
    d13 = d13**2 - (z3-z1)**2 
    d13 = math.sqrt(d13)
    d23 = d23**2 - (z3-z2)**2
    d23 = math.sqrt(d23)

    X3 =((d12**2)+(d13**2)-(d23**2))
    X3 = X3/(2*d12)
    Y3 = d13**2 - X3**2
    Y3 = math.sqrt(Y3)


    //D34 er den forventede avstanden mellom punkt 3 og 4
    D34 = math.sqrt((x4-X3)**2 + (y4-Y3)**2 +(z4-z3)**2)



    if d34 != D34:
        Y3 = Y3 *-1
        d34 = math.sqrt((x4-X3)**2 + (y4-Y3)**2 +(z4-z3)**2)
        print("feil funnet, flipper y3 kordinat til:", Y3, "fra", Y3*-1)
        
    print("bakkestasjon 3 befinner seg på kordinatene", X3,",", Y3,",", z3)
    print("bakkestasjon 2 befinner seg på kordinatene", x2,",", 0,",", z2)*/

    return new Vector3(0);
}