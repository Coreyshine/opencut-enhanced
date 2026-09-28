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

// old-tv spec: values[0] = (intensity 0..100, time seconds, unused, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;

    // Horizontal jitter (tracking glitch).
    let jitter = (hash(vec2f(floor(time * 30.0), floor(input.tex_coord.y * 120.0))) - 0.5) * 0.004 * intensity;
    var uv = vec2f(input.tex_coord.x + jitter, input.tex_coord.y);

    var color = textureSampleLevel(input_texture, input_sampler, uv, 0.0);

    // Desaturate toward b/w with a slight green tint.
    let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
    let bw = vec3f(luma * 0.95, luma, luma * 0.92);
    color = vec4f(mix(color.rgb, bw, intensity), color.a);

    // Scanlines.
    let scan = sin(input.tex_coord.y * uniforms.resolution.y * 1.6) * 0.5 + 0.5;
    color = vec4f(color.rgb * mix(1.0, 0.55 + 0.45 * scan, intensity), color.a);

    // Rolling bar.
    let bar = sin(fract(input.tex_coord.y + time * 0.15) * 6.2831853);
    color = vec4f(color.rgb * mix(1.0, 1.0 + 0.08 * bar, intensity), color.a);

    // Noise.
    let noise = (hash(uv * uniforms.resolution + vec2f(time * 60.0)) - 0.5) * 0.15 * intensity;
    color = vec4f(color.rgb + vec3f(noise), color.a);

    // Corner vignette (CRT tube).
    let d = distance(input.tex_coord, vec2f(0.5)) * 1.4142;
    color = vec4f(color.rgb * (1.0 - smoothstep(0.7, 1.25, d) * intensity), color.a);

    return color;
}
