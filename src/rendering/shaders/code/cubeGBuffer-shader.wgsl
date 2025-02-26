//VERTEX
struct Global {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    invViewProjectionMatrix: mat4x4f
}

struct Model {
    modelMatrix: mat4x4f,
    normalModelMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> global : Global;
@group(2) @binding(0) var<uniform> model : Model;

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
    var viewProjectionMatrix : mat4x4f = global.projectionMatrix * global.viewMatrix;

    var output : VertexOutput;
    let worldPosition = (model.modelMatrix * vec4(position, 1.0)).xyz;
    output.Position = viewProjectionMatrix * vec4(worldPosition, 1.0);
    output.fragNormal = normalize((model.normalModelMatrix * vec4(normal, 1.0)).xyz);
    output.fragUV = uv;
    return output;
}

//FRAGMENT
@group(3) @binding(1) var textureSampler: sampler;
@group(3) @binding(2) var textureAlbedo: texture_2d<f32>;

struct GBufferOutput {
    @location(0) normal : vec4f,

    // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
    @location(1) albedo : vec4f,
}

@fragment
fn fragmentMain(
    @location(0) fragNormal: vec3f,
    @location(1) fragUV : vec2f
) -> GBufferOutput {
    var output : GBufferOutput;
    output.normal = vec4(normalize(fragNormal), 1.0);
    output.albedo = textureSample(textureAlbedo, textureSampler, vec2f(fragUV.x, fragUV.y));

    return output;
}