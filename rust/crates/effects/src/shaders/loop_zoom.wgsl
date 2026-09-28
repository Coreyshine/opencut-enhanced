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

// loop-zoom spec: values[0] = (amount 0..100, period seconds, time seconds, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0 * 0.3;
    let period = max(0.2, uniforms.values[0].y);
    let time = uniforms.values[0].z;

    // Sawtooth ramp: zooms in, snaps back, repeats.
    let phase = fract(time / period);
    let zoom = 1.0 + amount * phase;
    let uv = (input.tex_coord - vec2f(0.5)) / zoom + vec2f(0.5);

    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
