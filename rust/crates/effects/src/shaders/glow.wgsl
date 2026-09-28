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

// glow spec: values[0] = (intensity 0..100, threshold 0..100, radius 0..100)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;
    var color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let intensity = uniforms.values[0].x / 100.0;
    let threshold = uniforms.values[0].y / 100.0;
    let radius_px = uniforms.values[0].z / 100.0 * (uniforms.resolution.y / 40.0);

    let sample_count = 24.0;
    var glow = vec3f(0.0);
    for (var i = 0.0; i < sample_count; i += 1.0) {
        let angle = i * 2.399963;
        let r = sqrt(i / sample_count) * radius_px;
        let offset = vec2f(cos(angle), sin(angle)) * r * texel_size;
        let s = textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0).rgb;
        glow = glow + max(s - vec3f(threshold), vec3f(0.0));
    }
    glow = glow / sample_count * 3.0;

    return vec4f(color.rgb + glow * intensity, color.a);
}
