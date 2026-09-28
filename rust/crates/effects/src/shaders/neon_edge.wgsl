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

// neon-edge spec: values[0].xyz = glow color, values[0].w = intensity 0..100

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let glowColor = vec3f(uniforms.values[0].x, uniforms.values[0].y, uniforms.values[0].z);
    let intensity = uniforms.values[0].w / 100.0;
    let texel = vec2f(1.0) / uniforms.resolution;

    let l = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(texel.x, 0.0), 0.0).rgb);
    let r = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, 0.0), 0.0).rgb);
    let t = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(0.0, texel.y), 0.0).rgb);
    let b = luma(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel.y), 0.0).rgb);

    let edge = clamp(abs(l - r) + abs(t - b), 0.0, 1.0);
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Darken base, add neon glow along edges.
    let base = color.rgb * 0.35;
    return vec4f(base + glowColor * edge * intensity * 2.0, color.a);
}
