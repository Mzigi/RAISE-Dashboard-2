struct Global {
    viewProjectionMatrix: mat4x4f,
}
struct Uniforms {
    modelMatrix : mat4x4f,
    normalModelMatrix : mat4x4f,
}
@group(0) @binding(0) var<uniform> global : Global;
@group(1) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
    @builtin(position) Position : vec4f,
    @location(0) fragNormal: vec3f,    // normal in world space
    @location(1) fragUV: vec2f,
}

@vertex
fn vertexMain(
    @location(0) position : vec3f,
    @location(1) normal : vec3f,
    @location(2) uv : vec2f
) -> VertexOutput {
    var output : VertexOutput;
    let worldPosition = (uniforms.modelMatrix * vec4(position, 1.0)).xyz;
    output.Position = camera.viewProjectionMatrix * vec4(worldPosition, 1.0);
    output.fragNormal = normalize((uniforms.normalModelMatrix * vec4(normal, 1.0)).xyz);
    output.fragUV = uv;
    return output;
}
