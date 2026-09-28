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

// watercolor spec: values[0].x = amount 0..100

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;

    // Jittered multi-sample average = soft wet-edge smearing.
    let jitter = amount * 6.0 / uniforms.resolution;
    var acc = vec4f(0.0);
    acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(hash(input.tex_coord * 91.7) - 0.5, hash(input.tex_coord * 45.3) - 0.5) * jitter * 2.0, 0.0);
    acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(hash(input.tex_coord * 17.9) - 0.5, hash(input.tex_coord * 63.1) - 0.5) * jitter * 2.0, 0.0);
    acc = acc + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(hash(input.tex_coord * 29.5) - 0.5, hash(input.tex_coord * 83.7) - 0.5) * jitter * 2.0, 0.0);

    var color = acc / 4.0;

    // Pigment pooling: gentle tonal quantization.
    let quantized = floor(color.rgb * 10.0) / 10.0;
    color = vec4f(mix(color.rgb, quantized, 0.4 * amount), color.a);

    return color;
}
