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

// transition-wipe spec: values[0] = (progress 0..1, angle degrees, softness 0..100).
// B is revealed behind an edge moving along `angle`; softness feathers the edge.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let progress = uniforms.values[0].x;
    let angle = uniforms.values[0].y * 3.14159265 / 180.0;
    let softness = max(0.001, uniforms.values[0].z / 100.0 * 0.4);

    let dir = vec2f(cos(angle), -sin(angle));
    let s = dot(input.tex_coord - vec2f(0.5), dir) + 0.5;
    let alpha_b = smoothstep(progress - softness * 0.5, progress + softness * 0.5, s);

    return mix(b, a, alpha_b);
}
