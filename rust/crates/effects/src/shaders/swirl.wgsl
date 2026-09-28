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

// swirl spec: values[0] = (angle degrees -360..360, radius 0..100, unused, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let angle = uniforms.values[0].x * 3.14159265 / 180.0;
    let radiusFraction = max(0.01, uniforms.values[0].y / 100.0);

    let centered = input.tex_coord - vec2f(0.5);
    let aspect = uniforms.resolution.x / uniforms.resolution.y;
    let scaled = vec2f(centered.x * aspect, centered.y);
    let dist = length(scaled);
    let maxRadius = 0.5 * radiusFraction * aspect;

    var uv = input.tex_coord;
    if (dist < maxRadius) {
        let falloff = 1.0 - dist / maxRadius;
        let theta = angle * falloff * falloff;
        let cosA = cos(theta);
        let sinA = sin(theta);
        let rotated = vec2f(
            centered.x * cosA - centered.y * sinA,
            centered.x * sinA + centered.y * cosA,
        );
        uv = vec2f(0.5) + rotated;
    }

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec4f(0.0);
    }
    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
