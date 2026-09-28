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

// transition-glitch spec: values[0] = (progress 0..1, intensity 0..100).
// Row displacement and RGB tearing peak mid-transition while A crossfades to B.

fn hash(point: vec2f) -> f32 {
    var p3 = fract(vec3f(point.x, point.y, point.x) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3f(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let progress = uniforms.values[0].x;
    let intensity = uniforms.values[0].y / 100.0;
    let strength = sin(progress * 3.14159265) * intensity;

    let row = floor(input.tex_coord.y * 90.0);
    let gate = step(0.8, hash(vec2f(row, 3.7)));
    let shift = (hash(vec2f(row, 11.0)) - 0.5) * strength * 0.3 * gate;
    let uv = vec2f(input.tex_coord.x + shift, input.tex_coord.y);

    let rgb_shift = vec2f(strength * 0.03 * gate, 0.0);
    let a_r = textureSampleLevel(input_texture, input_sampler, uv + rgb_shift, 0.0).r;
    let b_r = textureSampleLevel(second_texture, input_sampler, uv + rgb_shift, 0.0).r;
    let a_g = textureSampleLevel(input_texture, input_sampler, uv, 0.0).g;
    let b_g = textureSampleLevel(second_texture, input_sampler, uv, 0.0).g;
    let a_b = textureSampleLevel(input_texture, input_sampler, uv - rgb_shift, 0.0).b;
    let b_b = textureSampleLevel(second_texture, input_sampler, uv - rgb_shift, 0.0).b;

    return vec4f(mix(a_r, b_r, progress), mix(a_g, b_g, progress), mix(a_b, b_b, progress), 1.0);
}
