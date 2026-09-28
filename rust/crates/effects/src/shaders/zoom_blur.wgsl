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

// zoom-blur spec: values[0].x = amount 0..100, values[0].y/z = center (0..1 uv)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let center = vec2f(uniforms.values[0].y, uniforms.values[0].z);

    let to_center = input.tex_coord - center;
    let strength = amount * 0.35;

    let sample_count = 16.0;
    var acc = vec4f(0.0);
    for (var i = 0.0; i < sample_count; i += 1.0) {
        let t = (i / (sample_count - 1.0)) * strength;
        acc = acc + textureSampleLevel(input_texture, input_sampler, center + to_center * (1.0 - t), 0.0);
    }

    return acc / sample_count;
}
