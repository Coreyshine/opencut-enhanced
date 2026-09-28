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

// teal-orange spec: values[0] = (amount 0..100, balance 0..100, contrast 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    // balance <0.5 push teal, >0.5 push orange on skin tones.
    let balance = uniforms.values[0].y / 100.0;
    let contrast = 1.0 + uniforms.values[0].z / 100.0 * 0.5;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    var c = (color.rgb - vec3f(0.5)) * contrast + vec3f(0.5);

    let l = dot(c, vec3f(0.299, 0.587, 0.114));
    let shadowMask = 1.0 - smoothstep(0.0, 0.6, l);
    let skinMask = smoothstep(0.25, 0.75, c.r / max(c.b, 0.01)) * smoothstep(0.2, 0.9, l);

    // Teal shadows.
    c = mix(c, c + vec3f(-0.04, 0.05, 0.09), shadowMask * (1.0 - balance * 0.4));
    // Orange highlights/skin.
    c = mix(c, c + vec3f(0.1, 0.035, -0.07), skinMask * (0.6 + balance * 0.4));

    return vec4f(mix(color.rgb, clamp(c, vec3f(0.0), vec3f(1.0)), amount), color.a);
}
