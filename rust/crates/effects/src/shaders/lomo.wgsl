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

// lomo spec: values[0] = (amount 0..100, saturation 0..100, vignette 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let saturation = uniforms.values[0].y / 100.0 * 1.5;
    let vignette = uniforms.values[0].z / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    var c = color.rgb;

    // Oversaturation with red/blue bias.
    let l = dot(c, vec3f(0.299, 0.587, 0.114));
    c = clamp((c - vec3f(l)) * (1.0 + saturation) + c, vec3f(0.0), vec3f(1.0));
    c.r *= 1.08; c.b *= 1.05;

    // Strong corner vignette.
    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let dist = length((input.tex_coord - vec2f(0.5)) * aspect) / length(vec2f(0.5) * aspect);
    let vig = 1.0 - smoothstep(0.4, 1.1, dist) * vignette;

    return vec4f(mix(color.rgb, c * vig, amount), color.a);
}
