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

// bloom spec: values[0] = (amount 0..100, threshold 0..100, radius 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let threshold = uniforms.values[0].y / 100.0 * 0.8;
    let radius = max(1.0, uniforms.values[0].z / 100.0 * 10.0);

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // 12-tap golden-angle bloom sampling on bright pixels.
    var glow = vec3f(0.0);
    var total = 0.0;
    let golden = 2.39996;
    for (var i = 1.0; i <= 12.0; i += 1.0) {
        let ang = i * golden;
        let r = radius * sqrt(i / 12.0);
        let offset = vec2f(cos(ang) * r, sin(ang) * r) * texel;
        let sample = textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0);
        let bright = max(0.0, dot(sample.rgb, vec3f(0.299, 0.587, 0.114)) - threshold);
        glow += sample.rgb * bright;
        total += 1.0;
    }
    glow = glow / total * 1.8;

    return vec4f(mix(color.rgb, color.rgb + glow, amount), color.a);
}
