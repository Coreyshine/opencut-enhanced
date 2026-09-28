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

// film-fade spec: values[0] = (fade 0..100, grain 0..100, warmth 0..100, time)

fn ff_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let fade = uniforms.values[0].x / 100.0;
    let grainAmount = uniforms.values[0].y / 100.0;
    let warmth = uniforms.values[0].z / 100.0;
    let time = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Lifted blacks + reduced contrast (faded print).
    let lifted = color.rgb * (1.0 - fade * 0.25) + fade * 0.14;
    // Low saturation.
    let l = dot(lifted, vec3f(0.299, 0.587, 0.114));
    let desat = mix(lifted, vec3f(l), fade * 0.35);
    // Warm halation tilt.
    let warm = desat + vec3f(warmth * 0.06, warmth * 0.02, -warmth * 0.03);

    // Film grain.
    let grain = (ff_hash(input.tex_coord * uniforms.resolution + vec2f(time * 60.0)) - 0.5) * grainAmount * 0.12;

    return vec4f(clamp(warm + grain, vec3f(0.0), vec3f(1.0)), color.a);
}
