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

// transition-spin spec: values[0].x = progress 0..1.
// A rotates out with spin+shrink, B rotates in from opposite spin.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let ease = progress * progress * (3.0 - 2.0 * progress);

    // A: spins up to 180° while shrinking to 0.
    let scaleA = 1.0 - ease;
    if (scaleA > 0.001) {
        let angleA = ease * 3.14159265;
        let centeredA = (input.tex_coord - vec2f(0.5)) / scaleA;
        let rotA = vec2f(
            centeredA.x * cos(angleA) + centeredA.y * sin(angleA),
            -centeredA.x * sin(angleA) + centeredA.y * cos(angleA),
        ) + vec2f(0.5);
        let inA = rotA.x >= 0.0 && rotA.x <= 1.0 && rotA.y >= 0.0 && rotA.y <= 1.0;
        if (inA) {
            return textureSampleLevel(input_texture, input_sampler, rotA, 0.0);
        }
    }

    // B: counter-spins from 180° while growing.
    let scaleB = ease;
    if (scaleB > 0.001) {
        let angleB = (1.0 - ease) * 3.14159265;
        let centeredB = (input.tex_coord - vec2f(0.5)) / scaleB;
        let rotB = vec2f(
            centeredB.x * cos(angleB) - centeredB.y * sin(angleB),
            centeredB.x * sin(angleB) + centeredB.y * cos(angleB),
        ) + vec2f(0.5);
        let inB = rotB.x >= 0.0 && rotB.x <= 1.0 && rotB.y >= 0.0 && rotB.y <= 1.0;
        if (inB) {
            return textureSampleLevel(second_texture, input_sampler, rotB, 0.0);
        }
    }

    return vec4f(0.0, 0.0, 0.0, 1.0);
}
