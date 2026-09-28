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

// sketch spec: values[0].x = intensity 0..100

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let texel = vec2f(1.0) / uniforms.resolution;

    let l00 = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(-texel.x, -texel.y), 0.0).rgb);
    let l10 = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, -texel.y), 0.0).rgb);
    let l01 = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(-texel.x, texel.y), 0.0).rgb);
    let l11 = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, texel.y), 0.0).rgb);

    // Sobel-ish gradient magnitude.
    let gx = l10 - l00 + (2.0 * luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, 0.0), 0.0).rgb))
        - (2.0 * luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(-texel.x, 0.0), 0.0).rgb)) + l11 - l01;
    let gy = l01 - l00 + (2.0 * luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel.y), 0.0).rgb))
        - (2.0 * luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, -texel.y), 0.0).rgb)) + l11 - l10;
    let edge = clamp(length(vec2f(gx, gy)) * 1.5, 0.0, 1.0);

    // Pencil strokes: dark edges on white paper, inverted so edges are ink.
    let paper = vec3f(0.96);
    let ink = 1.0 - edge * intensity;
    return vec4f(paper * ink, 1.0);
}
