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

// transition-drop spec: values[0].x = progress 0..1
// B drops in from the top with an overshoot bounce; A slides down out.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;

    // Overshoot ease: drops past the target then settles.
    let p = min(progress * 1.25, 1.0);
    let overshoot = 1.0 + 2.7 * pow(p - 1.0, 3.0) + 1.7 * pow(p - 1.0, 2.0);
    let eased = select(overshoot, 1.0, progress >= 1.0);

    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    // A slides down out of frame.
    let uvA = input.tex_coord - vec2f(0.0, eased);
    if (uvA.y >= 0.0) {
        return textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    }

    // B occupies the frame once dropped.
    return b;
}
