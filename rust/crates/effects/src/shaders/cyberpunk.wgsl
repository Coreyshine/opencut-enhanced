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

// cyberpunk spec: values[0] = (amount 0..100, glow 0..100, time, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let glow = uniforms.values[0].y / 100.0;
    let time = uniforms.values[0].z;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Neon split: magenta/cyan channel offset.
    let l = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(texel.x * 2.0, 0.0), 0.0);
    let r = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x * 2.0, 0.0), 0.0);
    var neon = vec3f(center.r + (r.r - center.r) * 0.6, center.g, center.b + (l.b - center.b) * 0.6);

    // Cyber grade: crush greens, push magenta/cyan.
    let luma = dot(neon, vec3f(0.299, 0.587, 0.114));
    neon = mix(neon, vec3f(luma), 0.2);
    neon += vec3f(0.10, -0.04, 0.14) * amount;
    // Pulsing city glow.
    neon *= 1.0 + 0.08 * sin(time * 2.0) * glow;

    // Edge glow on luminance transitions.
    let edgeDist = abs(luma - dot(l, vec3f(0.33))) + abs(luma - dot(r, vec3f(0.33)));
    neon += vec3f(0.9, 0.2, 1.0) * smoothstep(0.1, 0.5, edgeDist) * glow * 0.5;

    return vec4f(mix(center.rgb, clamp(neon, vec3f(0.0), vec3f(1.0)), amount), center.a);
}
