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

// fisheye spec: values[0].x = amount -100..100 (negative = pinch/cushion)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let centered = input.tex_coord - vec2f(0.5);
    let r2 = dot(centered, centered);

    // Barrel (amount > 0) or cushion (amount < 0) distortion.
    let distortion = 1.0 + amount * 1.2 * r2;
    let uv = vec2f(0.5) + centered / distortion;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4f(0.0);
    }
    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
