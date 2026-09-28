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

// lowlight spec: values[0] = (lift 0..100, warmth 0..100, denoise 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let lift = uniforms.values[0].x / 100.0;
    let warmth = uniforms.values[0].y / 100.0;
    let denoise = uniforms.values[0].z / 100.0;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let center = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Light denoise: 4-tap average blend.
    let l = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(texel.x, 0.0), 0.0);
    let rr = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel.x, 0.0), 0.0);
    let u = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(0.0, texel.y), 0.0);
    let d = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel.y), 0.0);
    let avg = (center.rgb + l.rgb + rr.rgb + u.rgb + d.rgb) * 0.2;
    var outColor = mix(center.rgb, avg, denoise * 0.7);

    // Shadow lift with soft rolloff (keeps highlights).
    let lifted = outColor + (vec3f(1.0) - outColor) * outColor * lift * 0.9;
    outColor = mix(outColor, lifted, lift);

    // Gentle warmth.
    outColor += vec3f(warmth * 0.05, warmth * 0.015, -warmth * 0.03);

    return vec4f(clamp(outColor, vec3f(0.0), vec3f(1.0)), center.a);
}
