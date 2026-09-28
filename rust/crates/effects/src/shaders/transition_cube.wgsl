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

// transition-cube spec: values[0] = (progress 0..1)
// 3D cube rotation: A rotates out, B rotates in.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let angle = progress * 1.5707963;

    // Half-space split with perspective foreshortening.
    let isA = input.tex_coord.x < 1.0 - progress;

    var uvA = input.tex_coord;
    var uvB = input.tex_coord;

    if (isA) {
        // A face slides right and shrinks toward edge.
        let local = (input.tex_coord.x) / max(1.0 - progress, 0.001);
        uvA = vec2f(local, input.tex_coord.y);
        let shrink = 1.0 - progress * 0.3;
        uvA.y = (uvA.y - 0.5) / shrink + 0.5;
        let ca = cos(angle); let sa = sin(angle);
        let x = uvA.x - 0.5;
        uvA.x = ca * x + 0.5;
        return textureSampleLevel(input_texture, input_sampler, clamp(uvA, vec2f(0.0), vec2f(1.0)), 0.0);
    }

    // B face unfolds in from the left.
    let local = (input.tex_coord.x - (1.0 - progress)) / max(progress, 0.001);
    uvB = vec2f(local, input.tex_coord.y);
    let shrink = 1.0 - (1.0 - progress) * 0.3;
    uvB.y = (uvB.y - 0.5) / shrink + 0.5;
    let cb = cos(angle - 1.5707963); let sb = sin(angle - 1.5707963);
    let x = uvB.x - 0.5;
    uvB.x = cb * x + 0.5;
    return textureSampleLevel(second_texture, input_sampler, clamp(uvB, vec2f(0.0), vec2f(1.0)), 0.0);
}
