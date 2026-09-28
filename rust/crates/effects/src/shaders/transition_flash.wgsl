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

// transition-flash spec: values[0].x = progress 0..1.
// Camera-flash style: quick white blowout at the cut with a crossfade under it.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let progress = uniforms.values[0].x;
    let crossfaded = mix(a, b, progress);

    // Flash intensity peaks at the middle then decays.
    let flash = pow(1.0 - abs(progress - 0.5) * 2.0, 2.5);

    return vec4f(mix(crossfaded.rgb, vec3f(1.0), flash), crossfaded.a);
}
