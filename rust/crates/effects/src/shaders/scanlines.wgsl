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

// scanlines spec: values[0] = (intensity 0..100, spacing px 2..20, speed, time seconds)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let spacing = max(2.0, uniforms.values[0].y);
    let speed = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let phase = input.tex_coord.y * uniforms.resolution.y / spacing + time * speed;
    let scan = sin(phase * 6.2831853) * 0.5 + 0.5;

    return vec4f(color.rgb * mix(1.0, 0.5 + 0.5 * scan, intensity), color.a);
}
