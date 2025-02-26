@group(0) @binding(0) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(1) var gBufferAlbedo: texture_2d<f32>;
@group(0) @binding(2) var gBufferDepth: texture_depth_2d;

struct LightInfo {
    dirLightVector: vec4f,
    dirLightColor: vec4f,
    ambientLightColor: vec4f,

    viewPos: vec4f,

    screenResolution: vec2f,

    pointLightCount: u32,
}

struct PointLight {
    position: vec3f,

    specularColor: vec3f,
    diffuseColor: vec3f,

    constantLinearQuadratic: vec3f,
}

@group(1) @binding(0) var<uniform> lightInfo: LightInfo;
@group(1) @binding(1) var<storage, read> pointLights: array<PointLight>;

struct Global {
    projectionMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    invViewProjectionMatrix: mat4x4f,
}

@group(2) @binding(0) var<uniform> global : Global;

//directional light function
fn calculateDirLight(normal: vec3f) -> vec3f {
    let directionalLight : f32 = dot(normal, normalize(lightInfo.dirLightVector.xyz));
    let dirLight : vec3f = (lightInfo.dirLightColor.rgb * max(directionalLight, 0.0));
    return dirLight;
}

fn calculatePointLight(light: PointLight, normal: vec3f, coord: vec3f) -> vec3f {
    let constant: f32 = light.constantLinearQuadratic.x;
    let linear: f32 = light.constantLinearQuadratic.y;
    let quadratic: f32 = light.constantLinearQuadratic.z;

    let specularStrength : f32 = 1.0;

    let lightDir : vec3f = normalize(light.position - coord);
    let viewDir : vec3f = normalize(lightInfo.viewPos.xyz - coord);

    //specular
    let halfWayDir : vec3f = normalize(lightDir + viewDir);

    let spec : f32 = pow(max(dot(normal, halfWayDir), 0.0), 128.0);
    let specular : vec3f = specularStrength * spec * light.specularColor.rgb;

    //diffuse
    let diffuseLight : f32 = dot(normal, normalize(lightDir));
    let diffLight : vec3f = (light.diffuseColor.rgb * max(diffuseLight, 0.0));

    //final
    let distance : f32 = length(light.position - coord);
    let attenuation : f32 = 1.0 / (constant + linear * distance + quadratic * (distance * distance));

    return (diffLight * attenuation + specular * attenuation);
}

fn world_from_screen_coord(coord : vec2f, depth_sample: f32) -> vec3f {
  // reconstruct world-space position from the screen coordinate.
  let posClip = vec4(coord.x * 2.0 - 1.0, (1.0 - coord.y) * 2.0 - 1.0, depth_sample, 1.0);
  let posWorldW = global.invViewProjectionMatrix * posClip;
  let posWorld = posWorldW.xyz / posWorldW.www;
  return posWorld;
}

fn caculateSpecular(normal: vec3f, coord: vec3f) -> vec3f {
    let specularStrength : f32 = 1.0;

    let viewDir : vec3f = normalize(lightInfo.viewPos.xyz - coord);
    //let reflectDir : vec3f = reflect(-lightInfo.dirLightVector.xyz, normal);

    let halfWayDir : vec3f = normalize(lightInfo.dirLightVector.xyz + viewDir);

    let spec : f32 = pow(max(dot(normal, halfWayDir), 0.0), 128.0);
    let specular : vec3f = specularStrength * spec * lightInfo.dirLightColor.rgb;  

    return specular;
}

@fragment
fn fragmentMain(
    @builtin(position) coord : vec4f
) -> @location(0) vec4f {
    var result : vec3f;

    let normal = textureLoad(
        gBufferNormal,
        vec2i(floor(coord.xy)),
        0
    ).xyz;

    let albedo = textureLoad(
        gBufferAlbedo,
        vec2i(floor(coord.xy)),
        0
    ).rgb;

    let rawDepth = textureLoad(
      gBufferDepth,
      vec2i(floor(coord.xy)),
      0
    );

    // remap depth into something a bit more visible
    let depth = (1.0 - rawDepth) * 50.0;

    let worldPos : vec3f = world_from_screen_coord(coord.xy / lightInfo.screenResolution, rawDepth);
    var pointLightColor : vec3f = vec3f(0.0, 0.0, 0.0);

    for (var i = 0u; i < lightInfo.pointLightCount; i++) {
        let light = pointLights[i];
        pointLightColor += calculatePointLight(light, normal, worldPos);
    }

    result = albedo * (caculateSpecular(normal, worldPos) + calculateDirLight(normal) + lightInfo.ambientLightColor.rgb + pointLightColor);

    return vec4(result, 1.0);
    //return vec4(result, 1.0);
}