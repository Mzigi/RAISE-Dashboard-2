import { Vector3 } from "./model";

export enum LightType {
    Virtual,
    Point,
    Spot,
}

export class Light {
    static lightType: LightType = LightType.Virtual;

    id: number | undefined;

    position: Vector3 = new Vector3(0, 0, 0);
    distance: number = 10;

    diffuseColor: Vector3 = new Vector3(255, 255, 255);
    specularColor: Vector3 = new Vector3(255, 255, 255);

    private _constant?: number;
    private _linear?: number;
    private _quadratic?: number;

    get static(): typeof Light {
        return (<typeof Light><unknown>this.constructor);
    }

    get constant(): number {
        if (this._constant) {
            return this._constant;
        }

        return 1;
    }

    set constant(val: number) {
        this._constant = val;
    }

    get linear(): number {
        if (this._linear) {
            return this._linear;
        }

        return 4.6905 * Math.pow(this.distance, -1.0097);
    }

    set linear(val: number) {
        this._linear = val;
    }

    get quadratic(): number {
        if (this._quadratic) {
            return this._quadratic;
        }

        return 82.448 * Math.pow(this.distance, -2.0192);
    }

    set quadratic(val: number) {
        this._quadratic = val;
    }
}

/*

Distance	Constant	Linear	Quadratic
  7	          1.0	     0.7	  1.8
  13          1.0	     0.35	  0.44
  20          1.0	     0.22	  0.20
  32          1.0	     0.14	  0.07
  50          1.0	     0.09	  0.032
  65          1.0	     0.07	  0.017
  100         1.0	     0.045	  0.0075
  160         1.0	     0.027	  0.0028
  200         1.0	     0.022	  0.0019
  325         1.0	     0.014	  0.0007
  600         1.0	     0.007	  0.0002
  3250	      1.0	     0.0014	  0.000007

*/

// x = Distance
// Linear(x) := 4.6905x^-1.0097
// Quadratic(x) := 82.448x^-2.0192

export class PointLight extends Light {
    static lightType: LightType = LightType.Point;
}