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

// ink spec: values[0] = (strength 0..100, threshold 0..100, softness 0..100, 0)

fn ink_lum(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let strength = uniforms.values[0].x / 100.0;
    let threshold = 0.15 + uniforms.values[0].y / 100.0 * 0.55;
    let softness = 0.05 + uniforms.values[0].z / 100.0 * 0.4;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    var l = ink_lum(center.rgb);

    // Slight neighborhood jitter for ink bleed.
    var blur = l;
    blur += ink_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, 0.0), 0.0).rgb);
    blur += ink_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(texel.x, 0.0), 0.0).rgb);
    blur += ink_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel.y), 0.0).rgb);
    blur += ink_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(0.0, texel.y), 0.0).rgb);
    blur = blur / 5.0;
    l = mix(l, blur, 0.6);

    let paper = 1.0 - smoothstep(threshold - softness, threshold + softness, l);
    let inkColor = vec3f(0.08, 0.09, 0.12);
    let paperColor = vec3f(0.96, 0.95, 0.92);
    let inked = mix(paperColor, inkColor, paper);

    return vec4f(mix(center.rgb, inked, strength), center.a);
}
