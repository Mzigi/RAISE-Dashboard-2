import { mat4 } from "wgpu-matrix";
import { Vector3 } from "./model";

export class Camera {
    position: Vector3;
    rotation: Vector3;

    nearZ: number = 0.1;
    farZ: number = 2000;

    fov: number = 70;

    constructor(position: Vector3 = new Vector3(0,0,0)) {
        this.position = position;
        this.rotation = new Vector3(0,0,0);
    }

    getMatrix(): Float32Array {
        const cameraMatrix: Float32Array = mat4.translation([this.position.x, this.position.y, this.position.z]);
        mat4.rotateY(cameraMatrix, this.rotation.y * Math.PI / 180, cameraMatrix);
        mat4.rotateX(cameraMatrix, this.rotation.x * Math.PI / 180, cameraMatrix);
        mat4.rotateZ(cameraMatrix, this.rotation.z * Math.PI / 180, cameraMatrix);

        return cameraMatrix;
    }

    getViewMatrix(): Float32Array {
        return mat4.inverse(this.getMatrix());
    }

    getInverseViewMatrix(): Float32Array {
        return mat4.inverse(this.getViewMatrix()); //TODO: is this the same as getMatrix()???
    }

    getProjectionMatrix(aspect: number): Float32Array {
        return mat4.perspective(this.fov * Math.PI / 180, aspect, this.nearZ, this.farZ);
    }

    getDirectionVector(): Vector3 {
        const cameraRotation: Float32Array = mat4.rotationY(this.rotation.y * Math.PI / 180);
        mat4.rotateX(cameraRotation, this.rotation.x * Math.PI / 180, cameraRotation);
        mat4.rotateZ(cameraRotation, this.rotation.z * Math.PI / 180, cameraRotation);
        mat4.translate(cameraRotation, [0,0,-1], cameraRotation);

        const [x,y,z]: number[] = mat4.getTranslation(cameraRotation);
        return new Vector3(x,y,z);
    }

    getViewProjectionMatrix(aspect: number): Float32Array {
        return mat4.multiply(this.getProjectionMatrix(aspect), this.getViewMatrix());
    }

    /*lookAt(target: Vector3): void {
        const cameraLookAtMatrix: Float32Array = mat4.aim([this.position.x, this.position.y, this.position.z], [target.x, target.y, target.z], [0,1,0]);
        const cameraTranslation: Float32Array = mat4.getTranslation(cameraLookAtMatrix);
        const camRotX: number = mat4.getAxis(cameraLookAtMatrix, 0); //idk what getAxis does

        this.position = {
            x: cameraTranslation[0],
            y: cameraTranslation[1],
            z: cameraTranslation[2],
        };

    }*/
}