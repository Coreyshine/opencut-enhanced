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

// night-vision spec: values[0] = (intensity 0..100, time seconds, unused, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

    // Green phosphor monochrome with brightness lift.
    var nv = vec3f(luma * 0.35, luma * 1.5 + 0.12, luma * 0.35);

    // Sensor noise.
    let noise = (hash(input.tex_coord * uniforms.resolution + vec2f(time * 60.0)) - 0.5) * 0.3;
    nv = nv + vec3f(noise * 0.5, noise, noise * 0.5);

    // Scope vignette.
    let d = distance(input.tex_coord, vec2f(0.5)) * 1.4142;
    nv = nv * (1.0 - smoothstep(0.5, 1.15, d));

    return vec4f(mix(color.rgb, nv, intensity), color.a);
}
