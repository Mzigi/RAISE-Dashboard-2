import React, { useEffect, useRef } from "react";
import { Renderer } from "../rendering/renderer";
import { DefaultRenderGraph } from "../rendering/derived/renderGraphs/default-renderGraph";
import { Rubiks } from "../rendering/graph3D";

function Graph3DWidget(): React.JSX.Element {
    const canvasRef = useRef(null);

    let renderer: Renderer;
    let game: Rubiks;

    let elapsedTime = 0;
    let fpsCounter = 0;
    let fpsTimer = 0;

    function update() {
        const deltaTime: number = performance.now()/1000 - elapsedTime;
        fpsCounter += 1;
        fpsTimer += deltaTime;

        if (fpsTimer >= 1) {
            const fpsElement: HTMLElement | null = document.getElementById("fps");
            if (fpsElement) {
                fpsElement.innerText = "FPS: " + fpsCounter;
            }
            fpsTimer = 0;
            fpsCounter = 0;
        }
        elapsedTime = performance.now()/1000;

        if (renderer.success && renderer.renderGraph) {
            renderer.render();
        }

        game.update();

        window.requestAnimationFrame(update);
    }

    useEffect(() => {
        let ignore = false;

        const canvas: HTMLCanvasElement = canvasRef.current as unknown as HTMLCanvasElement;
        renderer = new Renderer(canvas);
        game = new Rubiks(renderer);

        renderer.init().then(() => {
            console.log("Renderer initialized")
            if (ignore) return;
            if (!renderer.success) {
                alert("Your browser or device doesn't support WebGPU, try using the newest version of Edge or Chrome on a computer.");
            } //TODO: alert that webgpu is unavailable
            renderer.renderGraph = new DefaultRenderGraph(renderer);
            game.init();
            update();
        });
        
        return () => {
            ignore = true;
        }
    })

    return (
    <div className="widget graph-widget">
        <canvas ref={canvasRef}></canvas>
    </div>
    )
}

export default React.memo(Graph3DWidget);