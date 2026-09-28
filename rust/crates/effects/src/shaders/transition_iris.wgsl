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

// transition-iris spec: values[0] = (progress 0..1, feather 0..100, shape 0=circle 1=diamond, unused)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let feather = max(0.01, uniforms.values[0].y / 100.0);
    let shape = uniforms.values[0].z;

    let centered = input.tex_coord - vec2f(0.5);
    var d = length(centered) * 1.4142;
    if (shape > 0.5) {
        d = (abs(centered.x) + abs(centered.y)) * 2.0;
    }

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let reveal = smoothstep(progress - feather * 0.5, progress + feather * 0.5, d);
    return mix(b, a, reveal);
}
