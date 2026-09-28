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

// prism spec: values[0].x = intensity 0..100

fn hsv2rgb(c: vec3f) -> vec3f {
    let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, vec3f(0.0), vec3f(1.0)), c.y);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Horizontal rainbow spectrum multiply + slight RGB fringe.
    let spectrum = hsv2rgb(vec3f(fract(input.tex_coord.x * 1.5 + 0.58), 0.9, 1.0));
    let tinted = color.rgb * mix(vec3f(1.0), spectrum * 1.6, intensity);

    let shift = 0.002 * intensity;
    let r = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(shift, 0.0), 0.0).r * tinted.r / max(color.r, 0.001);
    let b = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(shift, 0.0), 0.0).b * tinted.b / max(color.b, 0.001);

    return vec4f(clamp(vec3f(r, tinted.g, b), vec3f(0.0), vec3f(1.0)), color.a);
}
