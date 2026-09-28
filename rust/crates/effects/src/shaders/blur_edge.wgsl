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

// blur-edge spec: values[0].x = amount 0..100 (blur grows toward edges)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;

    // Blur radius grows toward the frame edges.
    let d = distance(input.tex_coord, vec2f(0.5)) * 1.4142;
    let blurPx = amount * 30.0 * smoothstep(0.25, 1.0, d);
    let radius = blurPx / uniforms.resolution;

    let sampleCount = 10.0;
    var acc = vec4f(0.0);
    for (var i = 0.0; i < sampleCount; i += 1.0) {
        let angle = i * (6.2831853 / sampleCount);
        let offset = vec2f(cos(angle), sin(angle)) * radius;
        acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0);
        acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord - offset, 0.0);
    }

    return acc / (sampleCount * 2.0);
}
