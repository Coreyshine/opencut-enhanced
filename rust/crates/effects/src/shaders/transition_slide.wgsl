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

// transition-slide (push) spec: values[0] = (progress 0..1, angle degrees).
// A is pushed out along `angle` while B pushes in from behind it.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let angle = uniforms.values[0].y * 3.14159265 / 180.0;

    let dir = vec2f(cos(angle), -sin(angle));
    let s = dot(input.tex_coord - vec2f(0.5), dir) + 0.5;

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord - dir * progress, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord + dir * (1.0 - progress), 0.0);

    let alpha_b = 1.0 - smoothstep(progress - 0.001, progress + 0.001, s);
    return mix(a, b, alpha_b);
}
