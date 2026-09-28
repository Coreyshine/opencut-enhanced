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

// wave spec: values[0] = (amplitude 0..100, wavelength px 10..500, speed, time seconds)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amplitude = uniforms.values[0].x / 100.0 * 0.05;
    let wavelength = max(10.0, uniforms.values[0].y);
    let speed = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let phase = (input.tex_coord.y * uniforms.resolution.y / wavelength) + time * speed;
    let offset = sin(phase * 6.2831853) * amplitude;

    var uv = input.tex_coord + vec2f(offset, 0.0);
    if (uv.x < 0.0 || uv.x > 1.0) {
        uv.x = clamp(uv.x, 0.0, 1.0);
    }
    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
