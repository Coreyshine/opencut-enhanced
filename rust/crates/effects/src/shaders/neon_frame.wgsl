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

// neon-frame spec: values[0] = (border 0..100, glow, hue speed, time)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let border = 0.02 + uniforms.values[0].x / 100.0 * 0.12;
    let glowStrength = uniforms.values[0].y / 100.0;
    let hueSpeed = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Distance to frame border.
    let d = min(min(input.tex_coord.x, 1.0 - input.tex_coord.x), min(input.tex_coord.y, 1.0 - input.tex_coord.y));
    let line = 1.0 - smoothstep(0.0, border * 0.25, abs(d - border));
    let halo = 1.0 - smoothstep(border, border + border * 1.5 * (0.5 + glowStrength), d);

    // Animated rainbow neon.
    let hue = fract(d * 2.0 + time * hueSpeed * 0.3);
    let neon = clamp(abs(vec3f(hue * 6.0 - 3.0, 2.0, 4.0 - hue * 6.0) - 1.0), vec3f(0.0), vec3f(1.0));

    let frame = neon * (line * 1.2 + halo * glowStrength * 0.6);
    return vec4f(color.rgb + frame, color.a);
}
