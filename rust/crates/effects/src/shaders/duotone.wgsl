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

// duotone spec: values[0].xyz = dark color, values[0].w unused
//               values[1].xyz = light color, values[1].w unused

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let brightness = luma(color.rgb);
    let dark = vec3f(uniforms.values[0].x, uniforms.values[0].y, uniforms.values[0].z);
    let light = vec3f(uniforms.values[1].x, uniforms.values[1].y, uniforms.values[1].z);
    return vec4f(mix(dark, light, brightness), color.a);
}
