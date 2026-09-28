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
@group(0) @binding(2) var second_texture: texture_2d<f32>;

// transition-pixel-wipe spec: values[0] = (progress 0..1, cell 4..60)
// Pixel blocks sweep in from the left revealing B.

fn pw_hash(n: vec2f) -> f32 { return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let cell = max(6.0, uniforms.values[0].y);

    let cellUv = floor(input.tex_coord * uniforms.resolution / cell) * cell / uniforms.resolution + cell / uniforms.resolution * 0.5;
    let col = cellUv.x;
    let rnd = pw_hash(vec2f(floor(col * 10.0), floor(cellUv.y * 10.0)));

    // Staggered columns sweep left to right.
    let sweep = progress * (1.0 + rnd * 0.4);
    let showB = step(col, sweep);

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);
    return mix(a, b, showB);
}
