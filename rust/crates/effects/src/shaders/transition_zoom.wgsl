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
@group(0) @binding(2) var second_texture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// transition-zoom spec: values[0].x = progress 0..1.
// A zooms in past the camera while B settles in from a zoom-out.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let ease = progress * progress * (3.0 - 2.0 * progress);

    let uv_a = (input.tex_coord - vec2f(0.5)) / mix(1.0, 1.6, ease) + vec2f(0.5);
    let uv_b = (input.tex_coord - vec2f(0.5)) / mix(0.55, 1.0, ease) + vec2f(0.5);

    let a = textureSampleLevel(input_texture, input_sampler, uv_a, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, uv_b, 0.0);

    return mix(a, b, ease);
}
