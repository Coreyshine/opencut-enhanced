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

// transition-cross-zoom spec: values[0].x = progress 0..1
// Both clips zoom in with motion blur while crossfading.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let ease = progress * progress;

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    // Zoom both toward the center with progressive scale.
    let zoomA = 1.0 + ease * 0.6;
    let zoomB = 1.0 + (1.0 - ease) * 0.6;
    let uvA = (input.tex_coord - vec2f(0.5)) / zoomA + vec2f(0.5);
    let uvB = (input.tex_coord - vec2f(0.5)) / zoomB + vec2f(0.5);

    let ca = textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    let cb = textureSampleLevel(second_texture, input_sampler, uvB, 0.0);

    var mixed = mix(mix(a, ca, ease), mix(b, cb, 1.0 - ease), ease);

    // Soft blur feel: average with cross-sampled centers.
    mixed = vec4f(mix(mixed.rgb, mix(ca.rgb, cb.rgb, ease), 0.35), mixed.a);

    return mixed;
}
