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

// light-leak spec: values[0] = (intensity 0..100, time seconds, hue 0..360, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;
    let hue = uniforms.values[0].z;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Two drifting warm blobs (film light leaks).
    let t = time * 0.15;
    let c1 = vec2f(0.3 + 0.25 * sin(t * 1.3), 0.35 + 0.2 * cos(t * 0.9));
    let c2 = vec2f(0.75 + 0.2 * cos(t * 1.1 + 2.0), 0.6 + 0.25 * sin(t * 0.7 + 1.0));
    let d1 = 1.0 - smoothstep(0.0, 0.8, distance(input.tex_coord, c1));
    let d2 = 1.0 - smoothstep(0.0, 0.7, distance(input.tex_coord, c2));
    var leak = (d1 + d2) * intensity * 0.8;

    // Warm-orange leak tint modulated by hue offset.
    let hueRad = hue * 3.14159265 / 180.0;
    let tint = vec3f(1.0 + 0.2 * cos(hueRad), 0.75 + 0.1 * sin(hueRad), 0.35 + 0.15 * cos(hueRad * 1.7));

    // Gentle flicker.
    leak = leak * (0.85 + 0.15 * hash(vec2f(floor(time * 8.0), 3.0)));

    return vec4f(color.rgb + tint * leak, color.a);
}
