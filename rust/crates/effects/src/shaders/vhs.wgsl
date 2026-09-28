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

// vhs spec: values[0] = (intensity 0..100, time seconds, unused, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;

    // Chroma bleed: horizontal R/B split.
    let chromaShift = 0.0025 * intensity;
    var color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let r = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(chromaShift, 0.0), 0.0).r;
    let b = textureSampleLevel(input_texture, input_sampler, input.tex_coord - vec2f(chromaShift, 0.0), 0.0).b;
    color = vec4f(r, color.g, b, color.a);

    // Rolling tracking band: noisy white line drifting down.
    let bandY = fract(time * 0.1);
    let bandDist = abs(input.tex_coord.y - bandY);
    if (bandDist < 0.015) {
        let noise = hash(vec2f(input.tex_coord.x * 100.0, floor(time * 200.0)));
        color = vec4f(color.rgb + vec3f(noise * 0.6), color.a);
    }

    // Wave wobble near the band.
    let wobble = sin(input.tex_coord.y * 180.0 + time * 8.0) * 0.001 * intensity * (1.0 - smoothstep(0.0, 0.1, bandDist));
    let wob = textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(wobble, 0.0), 0.0);
    color = vec4f(mix(color.rgb, wob.rgb, 0.5), color.a);

    // Mild scanlines + noise.
    let scan = sin(input.tex_coord.y * uniforms.resolution.y * 1.2) * 0.5 + 0.5;
    color = vec4f(color.rgb * mix(1.0, 0.7 + 0.3 * scan, intensity), color.a);
    let noise = (hash(input.tex_coord * uniforms.resolution + vec2f(time * 90.0)) - 0.5) * 0.08 * intensity;
    color = vec4f(color.rgb + vec3f(noise), color.a);

    return color;
}
