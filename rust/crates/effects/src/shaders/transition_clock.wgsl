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

// transition-clock spec: values[0].x = progress 0..1 (radial sweep from 12 o'clock)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;

    let centered = input.tex_coord - vec2f(0.5);
    // Angle from 12 o'clock, clockwise.
    var angle = atan2(centered.x, -centered.y);
    if (angle < 0.0) { angle = angle + 6.2831853; }
    let swept = angle / 6.2831853;

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    return mix(b, a, select(0.0, 1.0, swept > progress));
}
