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

// vhs-tracking spec: values[0] = (amount 0..100, band speed, band height, jitter)

fn vt_hash(n: vec2f) -> f32 { return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let bandPos = fract(uniforms.values[0].y * 0.15);
    let bandHeight = 0.05 + uniforms.values[0].z / 100.0 * 0.2;
    let jitter = uniforms.values[0].w / 100.0 * 0.02;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let d = abs(input.tex_coord.y - bandPos);
    let inBand = 1.0 - smoothstep(bandHeight * 0.5, bandHeight, d);

    let rowRnd = vt_hash(vec2f(floor(input.tex_coord.y * uniforms.resolution.y / 3.0), floor(bandPos * 100.0)));
    let xShift = (rowRnd - 0.5) * inBand * jitter;
    let noisy = vt_hash(input.tex_coord * uniforms.resolution) * inBand * 0.25;

    let shifted = textureSampleLevel(input_texture, input_sampler, vec2f(input.tex_coord.x + xShift, input.tex_coord.y), 0.0);
    var outColor = mix(color.rgb, shifted.rgb, inBand);
    outColor += vec3f(noisy);
    let l = dot(outColor, vec3f(0.299, 0.587, 0.114));
    outColor = mix(outColor, vec3f(l), inBand * 0.4);

    return vec4f(mix(color.rgb, outColor, amount), color.a);
}
