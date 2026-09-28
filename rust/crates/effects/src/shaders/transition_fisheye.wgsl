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

// transition-fisheye spec: values[0].x = progress 0..1
// A bulges outward then B shrinks in from a bulge.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let ease = progress * progress * (3.0 - 2.0 * progress);

    // A bulges (zoom in with barrel distortion) until it fills past the frame.
    let bulgeA = 1.0 + ease * 0.8;
    let uvA = (input.tex_coord - vec2f(0.5)) / bulgeA + vec2f(0.5);
    // Barrel curve: push samples toward center edge.
    let centeredA = uvA - vec2f(0.5);
    let distA = length(centeredA);
    let warpedA = vec2f(0.5) + centeredA * (1.0 - 0.25 * ease * distA * distA);
    let a = textureSampleLevel(input_texture, input_sampler, warpedA, 0.0);

    // B shrinks in from a pinched state.
    let shrinkB = mix(1.6, 1.0, ease);
    let uvB = (input.tex_coord - vec2f(0.5)) / shrinkB + vec2f(0.5);
    let centeredB = uvB - vec2f(0.5);
    let distB = length(centeredB);
    let warpedB = vec2f(0.5) + centeredB * (1.0 + 0.3 * (1.0 - ease) * distB * distB);
    let b = textureSampleLevel(second_texture, input_sampler, warpedB, 0.0);

    return mix(a, b, ease);
}
