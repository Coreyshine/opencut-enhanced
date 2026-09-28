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

// transition-windmill spec: values[0] = (progress 0..1)
// Four windmill blades of B sweep over A.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;

    let center = vec2f(0.5);
    let pos = input.tex_coord - center;
    let ang = atan2(pos.y, pos.x) + 3.14159265;
    let dist = length(pos);

    // Windmill angle advances with progress; blades sweep rotationally.
    let sweepAngle = progress * 6.2831853;
    let bladeAngle = fract((ang - sweepAngle) / 6.2831853 + 1.0);
    let showB = step(bladeAngle, progress);

    let a = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let b = textureSampleLevel(second_texture, input_sampler, input.tex_coord, 0.0);

    // Blade edge highlight.
    let edge = smoothstep(0.02, 0.0, abs(bladeAngle - progress));
    let edgeGlow = edge * 0.4;

    return mix(a, b, showB) + vec4f(vec3f(edgeGlow), 0.0);
}
