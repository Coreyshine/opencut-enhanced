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

// mirror-grid spec: values[0] = (quadrant mode 0/1, amount 0..100, 0, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let mode = uniforms.values[0].x; // 0 = mirror, 1 = repeat tiles
    let amount = uniforms.values[0].y / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    if (amount < 0.01) { return color; }

    let uv = fract(input.tex_coord * 2.0);
    var mirrored = uv;
    if (mode < 0.5) {
        mirrored.x = 1.0 - abs(1.0 - uv.x * 2.0) * 0.5 - uv.x * 0.0;
        mirrored.x = mix(1.0 - abs(uv.x * 2.0 - 1.0), uv.x * 2.0, step(0.5, input.tex_coord.x));
        mirrored.y = mix(1.0 - abs(uv.y * 2.0 - 1.0), uv.y * 2.0, step(0.5, input.tex_coord.y));
    }

    let eff = mix(input.tex_coord, mirrored, amount);
    return textureSampleLevel(input_texture, input_sampler, eff, 0.0);
}
