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

// transition-ripple spec: values[0] = (progress 0..1, amplitude 0..100, unused, unused)
// Water ripple distortion: concentric waves distort the crossfade boundary.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let amplitude = uniforms.values[0].y / 100.0;

    let centered = input.tex_coord - vec2f(0.5);
    let dist = length(centered) * 1.4142;

    // Expanding ripple rings from the center.
    let ringPhase = dist * 25.0 - progress * 20.0;
    let offset = sin(ringPhase) * amplitude * 0.02 * sin(progress * 3.14159265);

    let uvA = input.tex_coord + offset * vec2f(1.0);
    let uvB = input.tex_coord - offset * vec2f(1.0);

    let a = textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, uvB, 0.0);

    return mix(a, b, progress);
}
