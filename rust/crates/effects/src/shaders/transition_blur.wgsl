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

// transition-blur spec: values[0] = (progress 0..1, amount 0..100).
// A blurs out while B blurs in, crossfading through the middle.

fn blur_at(texture: texture_2d<f32>, sampler: sampler, uv: vec2f, radius_px: vec2f) -> vec4f {
    let sample_count = 8.0;
    var acc = vec4f(0.0);
    for (var i = 0.0; i < sample_count; i += 1.0) {
        let angle = i * (6.2831853 / sample_count);
        let offset = vec2f(cos(angle), sin(angle)) * radius_px;
        acc = acc + textureSampleLevel(texture, sampler, uv + offset, 0.0);
        acc = acc + textureSampleLevel(texture, sampler, uv - offset, 0.0);
    }
    return acc / (sample_count * 2.0);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let amount = uniforms.values[0].y / 100.0;

    let radius_px = amount * 30.0 / uniforms.resolution;
    let a = blur_at(input_texture, input_sampler, input.tex_coord, radius_px * progress);
    let b = blur_at(second_texture, input_sampler, input.tex_coord, radius_px * (1.0 - progress));

    return mix(a, b, progress);
}
