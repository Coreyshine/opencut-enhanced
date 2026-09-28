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

// halation spec: values[0] = (amount 0..100, radius 1..6, threshold 0..100, time)

fn hal_lum(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let radius = max(1.0, uniforms.values[0].y);
    let threshold = 0.55 + uniforms.values[0].z / 100.0 * 0.3;

    let texel = radius / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Blur bright pixels only (film halation).
    var bleed = vec3f(0.0);
    var total = 0.0;
    for (var j = -2.0; j <= 2.0; j += 1.0) {
        for (var i = -2.0; i <= 2.0; i += 1.0) {
            let s = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(i, j) * texel * 0.6, 0.0).rgb;
            let l = hal_lum(s);
            let w = smoothstep(threshold, 1.0, l);
            bleed += s * vec3f(1.0, 0.35, 0.2) * w;
            total += 1.0;
        }
    }
    bleed = bleed / total;

    return vec4f(color.rgb + bleed * amount * 1.4, center.a);
}
