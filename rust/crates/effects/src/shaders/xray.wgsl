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

// xray spec: values[0] = (amount 0..100, tint 0..100, contrast 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let tint = uniforms.values[0].y / 100.0;
    let contrast = 1.0 + uniforms.values[0].z / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let l = dot(color.rgb, vec3f(0.299, 0.587, 0.114));

    // Invert + blue-cyan tint + boosted contrast.
    var c = vec3f(1.0 - l);
    c = (c - vec3f(0.5)) * contrast + vec3f(0.5);
    let xray = vec3f(0.1, 0.35, 1.0) * c * 1.3 + vec3f(0.0, 0.05, 0.15) * (1.0 - tint);

    return vec4f(mix(color.rgb, clamp(xray, vec3f(0.0), vec3f(1.0)), amount), color.a);
}
