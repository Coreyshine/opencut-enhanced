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

// letterbox spec: values[0] = (bar fraction 0..0.4, feather 0..0.05, 0, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let bar = clamp(uniforms.values[0].x, 0.0, 0.45);
    let feather = clamp(uniforms.values[0].y, 0.001, 0.2);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let top = smoothstep(bar - feather, bar + feather, input.tex_coord.y);
    let bottom = smoothstep(bar - feather, bar + feather, 1.0 - input.tex_coord.y);
    let visible = top * bottom;

    return vec4f(color.rgb * visible, color.a);
}
