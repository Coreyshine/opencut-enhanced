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

// hexagon-pixel spec: values[0] = (cell size px 4..80, mix 0..100, 0, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let cellPx = max(6.0, uniforms.values[0].x);
    let mixAmount = uniforms.values[0].y / 100.0;

    // Hex grid in pixel space.
    let px = input.tex_coord * uniforms.resolution;
    let w = vec2f(cellPx * 1.5, cellPx * 0.8660254);
    let a = floor(px / w);
    let b = floor((px + w * 0.5) / w);
    let ca = (a + 0.5) * w;
    let cb = (b + 0.5) * w;
    let cell = select(cb, ca, length(px - ca) <= length(px - cb));

    let cellUv = cell / uniforms.resolution;
    let pixelated = textureSampleLevel(input_texture, input_sampler, cellUv, 0.0);
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    return vec4f(mix(color.rgb, pixelated.rgb, mixAmount), color.a);
}
