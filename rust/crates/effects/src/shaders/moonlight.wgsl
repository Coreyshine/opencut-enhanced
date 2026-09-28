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

// moonlight spec: values[0] = (amount 0..100, strength 0..100, 0, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let strength = uniforms.values[0].y / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Day-for-night: darken, cool, boost blue, desaturate slightly.
    let luma = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
    let desat = mix(color.rgb, vec3f(luma), 0.35);
    var night = desat * vec3f(0.55, 0.7, 1.15) * (0.75 + 0.25 * strength);
    night += vec3f(0.02, 0.05, 0.12) * strength; // Moon fill.

    return vec4f(mix(color.rgb, night, amount), color.a);
}
