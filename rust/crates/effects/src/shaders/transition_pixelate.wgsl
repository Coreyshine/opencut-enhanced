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

// transition-pixelate spec: values[0] = (progress 0..1, cell size px 4..100, unused, unused)
// A pixelates away revealing B, then B un-pixelates.

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let maxSize = max(4.0, uniforms.values[0].y);

    // Pixel size peaks mid-transition.
    let cellSize = sin(progress * 3.14159265) * maxSize;
    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    if (cellSize < 1.5) {
        return mix(a, b, progress);
    }

    // Pixelate both sources at the current cell size.
    let cell = (floor(input.tex_coord * uniforms.resolution / cellSize) + vec2f(0.5)) * cellSize / uniforms.resolution;
    let pa = textureSampleLevel(input_texture, input_sampler, cell, 0.0);
    let pb = textureSampleLevel(second_texture, input_sampler, cell, 0.0);

    // Noise dissolve inside the pixelated phase.
    let noise = hash(floor(input.tex_coord * uniforms.resolution / max(2.0, cellSize * 0.5)));
    let reveal = smoothstep(0.3, 0.7, progress);
    let mixed = mix(mix(a, b, progress), mix(pa, pb, progress), step(noise, reveal * 0.5 + 0.25));

    return mix(mixed, mix(a, b, progress), smoothstep(0.85, 1.0, progress));
}
