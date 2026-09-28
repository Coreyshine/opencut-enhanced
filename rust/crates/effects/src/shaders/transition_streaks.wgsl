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
@group(0) @binding(2) var second_texture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// transition-streaks spec: values[0] = (progress 0..1, intensity 0..100, angle degrees, unused)
// Light streaks sweep across covering the cut (film-like light wipe).

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let intensity = uniforms.values[0].y / 100.0;
    let angle = uniforms.values[1].x * 3.14159265 / 180.0;

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let dir = vec2f(cos(angle), -sin(angle));
    let boundary = dot(input.tex_coord - vec2f(0.5), dir) + 0.5;
    let base = mix(a, b, smoothstep(progress - 0.15, progress + 0.15, boundary));

    // Multiple light streaks sweeping with the boundary.
    var streak = 0.0;
    for (var i = 0.0; i < 3.0; i += 1.0) {
        let offset = (i - 1.0) * 0.08;
        let streakCenter = progress + offset;
        let d = abs(boundary - streakCenter);
        let brightness = (1.0 - abs(i - 1.0) * 0.4) * intensity;
        streak = streak + (1.0 - smoothstep(0.0, 0.03, d)) * brightness;
    }

    return vec4f(base.rgb + vec3f(streak), base.a);
}
