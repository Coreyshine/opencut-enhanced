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

// transition-glitch-drift spec: values[0] = (progress 0..1, intensity 0..100, unused, unused)
// Heavy glitch: block displacement, RGB tear, vertical roll, digital noise.

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let intensity = uniforms.values[0].y / 100.0;
    let strength = sin(progress * 3.14159265) * intensity;

    let row = floor(input.tex_coord.y * 60.0);
    let gate = step(0.75, hash(vec2f(row, floor(progress * 40.0))));
    let shift = (hash(vec2f(row, floor(progress * 60.0) + 9.0)) - 0.5) * strength * 0.3 * gate;

    var uv = vec2f(input.tex_coord.x + shift, input.tex_coord.y);
    // Vertical roll bands.
    let roll = strength * 0.05 * gate * sin(progress * 20.0);
    uv.y = fract(uv.y + roll);

    let rgbShift = vec2f(strength * 0.02 * gate, 0.0);
    let r = textureSampleLevel(input_texture, input_sampler, uv + rgbShift, 0.0).r;
    let g = textureSampleLevel(input_texture, input_sampler, uv, 0.0).g;
    let b = textureSampleLevel(second_texture, input_sampler, uv - rgbShift, 0.0).b;

    let a = textureSampleLevel(input_texture, input_sampler, uv, 0.0);
    let bb = textureSampleLevel(second_texture, input_sampler, uv, 0.0);
    let crossfaded = mix(a, bb, progress);

    return vec4f(r, g, b, crossfaded.a);
}
