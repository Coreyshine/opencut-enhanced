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

// motion-blur spec: values[0] = (amount 0..100, angle degrees, unused, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let angle = uniforms.values[0].y * 3.14159265 / 180.0;
    let dir = vec2f(cos(angle), -sin(angle));
    // Max 60px of smear.
    let lengthPx = amount * 60.0;
    let texel = lengthPx / uniforms.resolution;

    let sampleCount = 16.0;
    var acc = vec4f(0.0);
    for (var i = 0.0; i < sampleCount; i += 1.0) {
        let f = (i / (sampleCount - 1.0) - 0.5) * 2.0;
        let uv = input.tex_coord + dir * texel * f;
        acc = acc + textureSampleLevel(input_texture, input_sampler, uv, 0.0);
    }
    return acc / sampleCount;
}
