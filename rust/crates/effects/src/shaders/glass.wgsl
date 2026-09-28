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

// glass spec: values[0] = (amount 0..100, cell size px 4..64, unused, unused)

fn hash2(n: vec2f) -> vec2f {
    return vec2f(
        fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453),
        fract(sin(dot(n, vec2f(39.425, 11.137))) * 24634.6345),
    );
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let cellSize = max(4.0, uniforms.values[0].y);

    // Blocky refraction: each cell samples from a hashed random offset.
    let cell = floor(input.tex_coord * uniforms.resolution / cellSize);
    let rnd = hash2(cell) - vec2f(0.5);
    let maxOffset = amount * cellSize * 1.5 / uniforms.resolution;
    let uv = input.tex_coord + rnd * maxOffset * 2.0;

    return textureSampleLevel(input_texture, input_sampler, clamp(uv, vec2f(0.0), vec2f(1.0)), 0.0);
}
