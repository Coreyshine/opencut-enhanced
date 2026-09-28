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

// transition-swirl-morph spec: values[0] = (progress 0..1, intensity 0..100, unused, unused)
// Both frames swirl into each other with a vortex centered mid-frame.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let intensity = uniforms.values[0].y / 100.0;

    let ease = progress * progress * (3.0 - 2.0 * progress);

    // Vortex: swirl angle peaks mid-transition, opposite directions per frame.
    let centered = input.tex_coord - vec2f(0.5);
    let dist = length(centered);
    let swirlAmount = sin(progress * 3.14159265) * intensity * 3.14159265 * (1.0 - dist);

    let cosA = cos(swirlAmount);
    let sinA = sin(swirlAmount);
    let uvA = vec2f(
        centered.x * cosA - centered.y * sinA,
        centered.x * sinA + centered.y * cosA,
    ) + vec2f(0.5);

    let cosB = cos(-swirlAmount);
    let sinB = sin(-swirlAmount);
    let uvB = vec2f(
        centered.x * cosB - centered.y * sinB,
        centered.x * sinB + centered.y * cosB,
    ) + vec2f(0.5);

    let a = textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, uvB, 0.0);

    return mix(a, b, ease);
}
