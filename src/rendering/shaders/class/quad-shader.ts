import { Shader, ShaderType } from "../../core/shader";
import { Renderer } from "../../renderer";

export class QuadFSShader extends Shader {
    constructor(renderer: Renderer, label: string) {
        super(renderer, label, ShaderType.Fragment);

        this.code = `
@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> screenResolution: vec2f;

@fragment
fn fragmentMain(
    @builtin(position) coord : vec4f
) -> @location(0) vec4f {
    return textureSample(inputTexture, textureSampler, coord.xy / screenResolution.xy);
}
        `;
        
        this.init();
    }
}

export class QuadVSShader extends Shader {
    constructor(renderer: Renderer, label: string) {
        super(renderer, label, ShaderType.Vertex);

        this.code = `
            @vertex
fn vertexMain(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  const pos = array(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}
        `;

        this.init();
    }
}