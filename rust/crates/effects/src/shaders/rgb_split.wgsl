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

// rgb-split spec: values[0] = (amount 0..100, angle degrees)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let angle = uniforms.values[0].y * 3.14159265 / 180.0;
    let dir = vec2f(cos(angle), -sin(angle));
    let offset = dir * (uniforms.values[0].x / 100.0) * 0.06;

    let r = textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0).r;
    let g = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0).g;
    let b = textureSampleLevel(input_texture, input_sampler, input.tex_coord - offset, 0.0).b;

    return vec4f(r, g, b, 1.0);
}
