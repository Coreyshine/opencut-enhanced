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

// fog spec: values[0] = (amount 0..100, speed, time, scale)

fn fog_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(127.1, 311.7))) * 43758.5453);
}

fn fog_noise(uv: vec2f) -> f32 {
    let i = floor(uv);
    let f = fract(uv);
    let a = fog_hash(i);
    let b = fog_hash(i + vec2f(1.0, 0.0));
    let c = fog_hash(i + vec2f(0.0, 1.0));
    let d = fog_hash(i + vec2f(1.0, 1.0));
    let mixv = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, mixv.x), mix(c, d, mixv.x), mixv.y);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let scale = max(1.0, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let uv = input.tex_coord * aspect * scale;
    let drift = time * speed * 0.2;
    let n1 = fog_noise(uv * 2.0 + vec2f(drift, drift * 0.3));
    let n2 = fog_noise(uv * 4.0 - vec2f(drift * 0.6, -drift * 0.5));
    let n3 = fog_noise(uv * 8.0 + vec2f(-drift * 0.8, drift * 0.4));
    let fog = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    let fogColor = vec3f(0.82, 0.86, 0.9);
    return vec4f(mix(color.rgb, fogColor, fog * amount * 0.75), color.a);
}
