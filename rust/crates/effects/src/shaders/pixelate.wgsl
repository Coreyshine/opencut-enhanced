struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    values: array<vec4f, 7>,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// pixelate spec: values[0].x = pixel size in output pixels (>= 1)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let block = max(1.0, uniforms.values[0].x);
    let block_uv =
        (floor(input.tex_coord * uniforms.resolution / block) + vec2f(0.5)) * block
            / uniforms.resolution;
    return textureSampleLevel(input_texture, input_sampler, block_uv, 0.0);
}
