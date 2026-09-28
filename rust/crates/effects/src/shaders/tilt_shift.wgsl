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

// tilt-shift spec: values[0] = (center 0..1, band 0..0.5, blur 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let center = uniforms.values[0].x;
    let band = max(0.03, uniforms.values[0].y);
    let blurAmount = uniforms.values[0].z / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Distance from the sharp band, 0 inside band → 1 far away.
    let d = abs(input.tex_coord.y - center);
    let blurFactor = smoothstep(band * 0.5, band, d) * blurAmount;

    if (blurFactor < 0.01) {
        return color;
    }

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    var acc = color;
    var total = 1.0;
    // 6-tap vertical blur scaled by blur factor (tilt-shift blurs vertically).
    let radius = blurFactor * 12.0;
    for (var i = 1.0; i <= 3.0; i += 1.0) {
        let o = texel.y * radius * i * 0.5;
        acc += textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, o), 0.0);
        acc += textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(0.0, o), 0.0);
        total += 2.0;
    }
    let blurred = acc / total;
    return vec4f(mix(color.rgb, blurred.rgb, blurFactor), color.a);
}
