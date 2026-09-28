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

// transition-dissolve spec: values[0] = (progress 0..1, graininess px).
// Static per-cell noise threshold revealed as progress rises.

fn hash(point: vec2f) -> f32 {
    var p3 = fract(vec3f(point.x, point.y, point.x) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3f(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let progress = uniforms.values[0].x;
    let cell_size = max(1.0, uniforms.values[0].y);
    let cell = floor(input.tex_coord * uniforms.resolution / cell_size);
    let n = hash(cell + vec2f(17.0, 43.0));

    let alpha_b = smoothstep(n - 0.15, n + 0.15, progress);
    return mix(a, b, alpha_b);
}
