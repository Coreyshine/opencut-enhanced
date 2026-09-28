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

// transition-fade spec: values[0].x = progress 0..1, values[0].yzw = fade color rgb.
// Outgoing fades to the color over the first half, incoming fades back in.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let progress = uniforms.values[0].x;
    let fade_color = vec4f(uniforms.values[0].y, uniforms.values[0].z, uniforms.values[0].w, 1.0);

    var result: vec4f;
    if (progress < 0.5) {
        result = mix(a, fade_color, progress * 2.0);
    } else {
        result = mix(fade_color, b, (progress - 0.5) * 2.0);
    }
    return result;
}
