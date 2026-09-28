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

// transition-split spec: values[0] = (progress 0..1, direction 0=horizontal 1=vertical, unused, unused)
// A splits open from the center revealing B behind.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let direction = uniforms.values[0].y;

    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    let ease = progress * progress * (3.0 - 2.0 * progress);
    let gap = ease * 0.5 + 0.0001;

    var uvA = input.tex_coord;
    if (direction < 0.5) {
        // Horizontal split: top half slides up, bottom half slides down.
        if (input.tex_coord.y < 0.5) {
            uvA.y = input.tex_coord.y - gap;
        } else {
            uvA.y = input.tex_coord.y + gap;
        }
    } else {
        // Vertical split.
        if (input.tex_coord.x < 0.5) {
            uvA.x = input.tex_coord.x - gap;
        } else {
            uvA.x = input.tex_coord.x + gap;
        }
    }

    if (uvA.x < 0.0 || uvA.x > 1.0 || uvA.y < 0.0 || uvA.y > 1.0) {
        return b;
    }
    let a = textureSampleLevel(input_texture, input_sampler, uvA, 0.0);
    return a;
}
