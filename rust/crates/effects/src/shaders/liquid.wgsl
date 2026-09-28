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

// liquid spec: values[0] = (amount 0..100, speed, scale, time)

fn liquid_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(127.1, 311.7))) * 43758.5453);
}

fn liquid_noise(uv: vec2f) -> f32 {
    let i = floor(uv);
    let f = fract(uv);
    let a = liquid_hash(i);
    let b = liquid_hash(i + vec2f(1.0, 0.0));
    let c = liquid_hash(i + vec2f(0.0, 1.0));
    let d = liquid_hash(i + vec2f(1.0, 1.0));
    let m = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, m.x), mix(c, d, m.x), m.y);
}

fn liquid_fbm(uv: vec2f, time: f32) -> f32 {
    var v = 0.0;
    var amp = 0.5;
    var p = uv;
    for (var i = 0; i < 3; i += 1) {
        v += amp * liquid_noise(p + vec2f(time * 0.3, -time * 0.2) * (i + 1.0) * 0.5);
        p = p * 2.0;
        amp *= 0.5;
    }
    return v;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0 * 0.05;
    let speed = uniforms.values[0].y;
    let scale = max(0.5, uniforms.values[0].z);
    let time = uniforms.values[0].w;

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let uv = input.tex_coord * aspect * scale;
    let t = time * speed * 0.3;

    let dx = liquid_fbm(uv * 1.5 + vec2f(t, 0.0), t) - 0.5;
    let dy = liquid_fbm(uv * 1.5 - vec2f(0.0, t), t + 7.3) - 0.5;

    return textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(dx, dy) * amount * 2.0, 0.0);
}
