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

// glitch spec: values[0] = (intensity 0..100, blockiness px, seed any)

fn hash(point: vec2f) -> f32 {
    var p3 = fract(vec3f(point.x, point.y, point.x) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3f(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let block_height = max(2.0, uniforms.values[0].y);
    let seed = uniforms.values[0].z;

    let row = floor(input.tex_coord.y * uniforms.resolution.y / block_height);
    let gate = step(0.72, hash(vec2f(seed * 13.0, row + 7.0)));
    let shift = (hash(vec2f(row, seed * 57.0)) - 0.5) * intensity * 0.25 * gate;
    let displaced_uv = vec2f(input.tex_coord.x + shift, input.tex_coord.y);

    let rgb_shift = vec2f(intensity * 0.015 * gate, 0.0);
    let r = textureSampleLevel(input_texture, input_sampler, displaced_uv + rgb_shift, 0.0).r;
    let g = textureSampleLevel(input_texture, input_sampler, displaced_uv, 0.0).g;
    let b = textureSampleLevel(input_texture, input_sampler, displaced_uv - rgb_shift, 0.0).b;

    return vec4f(r, g, b, 1.0);
}
