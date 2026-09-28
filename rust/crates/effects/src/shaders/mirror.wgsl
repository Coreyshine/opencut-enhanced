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

// mirror spec: values[0].x = mode 0 (left-right), 1 (top-bottom), 2 (quad)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let mode = uniforms.values[0].x;
    var uv = input.tex_coord;

    if (mode < 0.5) {
        // Left-right: right half mirrors the left half.
        uv.x = min(uv.x, 1.0 - uv.x) * 2.0;
    } else if (mode < 1.5) {
        // Top-bottom: bottom half mirrors the top half.
        uv.y = min(uv.y, 1.0 - uv.y) * 2.0;
    } else {
        // Quad: four quadrants mirror the top-left quadrant.
        uv = min(uv, vec2f(1.0) - uv) * 2.0;
    }

    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
