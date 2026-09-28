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

// rainbow-edge spec: values[0] = (strength 0..100, width 0..100, time, shift)

fn edge_lum(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let strength = uniforms.values[0].x / 100.0;
    let width = max(0.02, uniforms.values[0].y / 100.0 * 0.5);
    let time = uniforms.values[0].z;
    let shift = uniforms.values[0].w;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Edge = luminance gradient magnitude.
    let l0 = edge_lum(center.rgb);
    let lx = edge_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, 0.0), 0.0).rgb)
        - edge_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(texel.x, 0.0), 0.0).rgb);
    let ly = edge_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel.y), 0.0).rgb)
        - edge_lum(textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(0.0, texel.y), 0.0).rgb);
    let grad = vec2f(lx, ly);
    let mag = length(grad);

    let edge = smoothstep(0.05, 0.05 + width, mag);
    // Rainbow hue by position + time.
    let hue = fract(input.tex_coord.x * 2.0 + input.tex_coord.y + time * 0.15 + shift);
    let rainbow = clamp(abs(vec3f(hue * 6.0 - 3.0, 2.0, 4.0 - hue * 6.0) - 1.0), vec3f(0.0), vec3f(1.0));

    return vec4f(center.rgb + rainbow * edge * strength, center.a);
}
