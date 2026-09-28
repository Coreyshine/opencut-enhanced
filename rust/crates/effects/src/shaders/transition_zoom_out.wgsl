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

// transition-zoom-out spec: values[0].x = progress 0..1
// A zooms away (grows and fades), B starts oversized and settles down.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let ease = progress * progress * (3.0 - 2.0 * progress);

    // A zooms outward (grows past frame) and fades.
    let zoomA = 1.0 + ease * 1.2;
    let uvA = (input.tex_coord - vec2f(0.5)) / zoomA + vec2f(0.5);
    let a = textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    let fadeA = 1.0 - ease;

    // B starts oversized and settles to fit.
    let zoomB = mix(1.8, 1.0, ease);
    let uvB = (input.tex_coord - vec2f(0.5)) / zoomB + vec2f(0.5);
    let b = textureSampleLevel(second_texture, input_sampler, uvB, 0.0);

    let blended = mix(a * fadeA, b, ease);
    return blended;
}
