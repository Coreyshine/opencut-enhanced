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

// transition-dream spec: values[0] = (progress 0..1, amount 0..100, unused, unused)
// Soft blur + brightness lift pulse during crossfade (dreamy look).

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let amount = uniforms.values[0].y / 100.0;

    // Radial multi-tap blur, strongest mid-transition.
    let blurPx = sin(progress * 3.14159265) * amount * 16.0 / uniforms.resolution;
    var accA = vec4f(0.0);
    var accB = vec4f(0.0);
    let taps = 8.0;
    for (var i = 0.0; i < taps; i += 1.0) {
        let angle = i * (6.2831853 / taps);
        let offset = vec2f(cos(angle), sin(angle)) * blurPx;
        accA = accA + textureSampleLevel(input_texture, input_sampler, input.tex_coord + offset, 0.0);
        accB = accB + textureSampleLevel(second_texture, input_sampler, input.tex_coord + offset, 0.0);
    }
    let a = accA / taps;
    let b = accB / taps;

    var mixed = mix(a, b, progress);

    // Dreamy brightness lift at the peak.
    let lift = sin(progress * 3.14159265) * amount * 0.25;
    mixed = vec4f(mixed.rgb + vec3f(lift * 0.6, lift * 0.7, lift), mixed.a);

    return mixed;
}
