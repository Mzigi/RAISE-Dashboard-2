// VERTEX
struct Global {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    invViewProjectionMatrix: mat4x4f,
}

struct Model {
    modelMatrix: mat4x4f,
    normalModelMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> global : Global;
@group(2) @binding(0) var<uniform> model : Model;

struct VertexOutput {
    @builtin(position) Position : vec4f,
    @location(0) fragUV : vec2f,
    @location(1) fragPosition: vec4f,
}

@vertex
fn vertexMain(
    @location(0) position : vec3f,
    @location(1) normal : vec3f,
    @location(2) uv : vec2f
) -> VertexOutput {
    var newViewMatrix : mat4x4f = global.viewMatrix;
    newViewMatrix[3] = vec4(0.0,0.0,0.0,1.0);

    var newViewProjectionMatrix : mat4x4f = global.projectionMatrix * newViewMatrix;

    var output : VertexOutput;
    var finalPosition: vec4f = newViewProjectionMatrix * vec4(position, 1.0);
    finalPosition.z = finalPosition.w - 0.000001;
    output.Position = finalPosition;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (vec4(position,1) + vec4(1.0, 1.0, 1.0, 1.0));
    return output;
}

// FRAGMENT
@group(3) @binding(0) var mySampler: sampler;
@group(3) @binding(1) var myTexture: texture_cube<f32>;

@fragment
fn fragmentMain(
    @location(0) fragUV: vec2f,
    @location(1) fragPosition: vec4f
) -> @location(0) vec4f {
    // Our camera and the skybox cube are both centered at (0, 0, 0)
    // so we can use the cube geometry position to get viewing vector to sample
    // the cube texture. The magnitude of the vector doesn't matter.
    var cubemapVec = fragPosition.xyz - vec3(0.5);
    // When viewed from the inside, cubemaps are left-handed (z away from viewer),
    // but common camera matrix convention results in a right-handed world space
    // (z toward viewer), so we have to flip it.
    cubemapVec.z *= -1.0;
    return textureSample(myTexture, mySampler, cubemapVec);
}