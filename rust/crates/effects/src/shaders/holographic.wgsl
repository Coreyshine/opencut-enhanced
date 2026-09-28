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

// holographic spec: values[0] = (intensity 0..100, time seconds, unused, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;

    // Horizontal RGB split growing with intensity.
    let shift = 0.004 * intensity + 0.002 * sin(time * 2.0);
    let r = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(shift, 0.0), 0.0).r;
    let g = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0).g;
    let b = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(shift, 0.0), 0.0).b;

    // Cyan-magenta hologram tint.
    var color = vec3f(r * 0.75, g * 1.1, b * 1.25);

    // Animated scanlines.
    let scan = sin(input.tex_coord.y * uniforms.resolution.y * 0.8 + time * 6.0) * 0.5 + 0.5;
    color = color * mix(1.0, 0.6 + 0.4 * scan, intensity);

    // Translucency glow lift.
    color = color + vec3f(0.0, 0.08, 0.12) * intensity;

    return vec4f(color, 1.0);
}
