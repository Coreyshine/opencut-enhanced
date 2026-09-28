struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

// Shared uniform block across all effect/transition shaders:
// values[] holds the shader's uniforms packed in its spec order.
// gaussian-blur spec: values[0].x = sigma, values[0].y = step,
// direction kept in the legacy `direction` field.
struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    values: array<vec4f, 7>,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;
    let sigma = uniforms.values[0].x;
    let step_size = uniforms.values[0].y;

    var color = vec4f(0.0, 0.0, 0.0, 0.0);
    var total_weight = 0.0;

    for (var index = -30; index <= 30; index = index + 1) {
        let position = f32(index) * step_size;
        let weight = exp(-(position * position) / (2.0 * sigma * sigma));
        let sample_uv = input.tex_coord + (texel_size * uniforms.direction * position);
        color = color + textureSampleLevel(input_texture, input_sampler, sample_uv, 0.0) * weight;
        total_weight = total_weight + weight;
    }

    return color / total_weight;
}
