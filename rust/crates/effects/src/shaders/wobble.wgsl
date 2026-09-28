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

// wobble spec: values[0] = (amount 0..100, frequency, speed, time)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0 * 0.03;
    let frequency = max(0.5, uniforms.values[0].y);
    let speed = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let amp = amount * vec2f(uniforms.resolution.y / uniforms.resolution.x, 1.0);
    let offset = vec2f(
        sin(input.tex_coord.y * frequency * 6.28 + time * speed) * amp.x,
        cos(input.tex_coord.x * frequency * 6.28 + time * speed * 0.9) * amp.y,
    );

    return textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0);
}
