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

// vignette spec: values[0] = (amount 0..100, radius 0..100, softness 0..100)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    var color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let amount = uniforms.values[0].x / 100.0;
    let radius = uniforms.values[0].y / 100.0;
    let softness = uniforms.values[0].z / 100.0;

    let d = distance(input.tex_coord, vec2f(0.5)) * 1.4142;
    let start = 0.35 + 0.65 * radius;
    let edge = start * (1.0 - softness * 0.9);
    let factor = 1.0 - amount * smoothstep(edge, start, d);

    return vec4f(color.rgb * factor, color.a);
}
