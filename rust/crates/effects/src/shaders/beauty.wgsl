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

// beauty spec: values[0] = (smoothing 0..100, brightness 0..50, warmth 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let smoothing = uniforms.values[0].x / 100.0;
    let brightness = uniforms.values[0].y / 100.0;
    let warmth = uniforms.values[0].z / 100.0;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // 8-tap neighborhood, keep only samples close in color (edge preserving).
    var sum = vec3f(0.0);
    var weight = 0.0;
    for (var dy = -1.0; dy <= 1.0; dy += 1.0) {
        for (var dx = -1.0; dx <= 1.0; dx += 1.0) {
            if (dx == 0.0 && dy == 0.0) { continue; }
            let sample = textureSampleLevel(
                input_texture,
                input_sampler,
                input.tex_coord + vec2f(dx, dy) * texel * 1.5,
                0.0,
            );
            let dist = length(sample.rgb - center.rgb);
            let w = max(0.0, 1.0 - dist * 4.0);
            sum += sample.rgb * w;
            weight += w;
        }
    }
    let smoothed = mix(center.rgb, sum / max(weight, 1.0), smoothing);

    // Slight brightening and warmth for the beauty look.
    var outColor = smoothed * (1.0 + brightness * 0.35);
    outColor += vec3f(warmth * 0.045, warmth * 0.02, -warmth * 0.02);

    return vec4f(outColor, center.a);
}
