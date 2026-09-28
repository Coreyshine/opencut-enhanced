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

// transition-whip spec: values[0] = (progress 0..1, direction degrees, blur px 0..100, unused)
// Directional slide with strong built-in motion blur (whip pan).

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let angle = uniforms.values[1].x * 3.14159265 / 180.0;
    let blurStrength = uniforms.values[1].y / 100.0;

    let dir = vec2f(cos(angle), -sin(angle));
    // A slides out along dir, B slides in from the opposite side.
    let ease = 0.5 - 0.5 * cos(progress * 3.14159265);
    let uvA = input.tex_coord + dir * ease;
    let uvB = input.tex_coord + dir * (ease - 1.0);

    // Motion blur: multi-tap along dir, strength peaks mid-transition.
    let blurPx = blurStrength * 40.0 * sin(progress * 3.14159265) / uniforms.resolution;
    var accA = vec4f(0.0);
    var accB = vec4f(0.0);
    let taps = 8.0;
    for (var i = 0.0; i < taps; i += 1.0) {
        let f = (i / (taps - 1.0) - 0.5) * 2.0;
        accA = accA + textureSampleLevel(input_texture, input_sampler, uvA + dir * blurPx * f, 0.0);
        accB = accB + textureSampleLevel(second_texture, input_sampler, uvB + dir * blurPx * f, 0.0);
    }
    let a = accA / taps;
    let b = accB / taps;

    // Blend across the pan boundary.
    let boundary = dot(input.tex_coord - vec2f(0.5), dir) + 0.5;
    return mix(b, a, smoothstep(ease - 0.08, ease + 0.08, boundary));
}
