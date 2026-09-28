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

// pulse spec: values[0] = (amount 0..100, speed, time seconds, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0 * 0.15;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;

    // Sinusoidal center zoom (crops in, never out of bounds).
    let zoom = 1.0 + amount * (0.5 - 0.5 * cos(time * speed * 6.2831853));
    let uv = (input.tex_coord - vec2f(0.5)) / zoom + vec2f(0.5);

    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
