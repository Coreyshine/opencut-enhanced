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

// bleach-bypass spec: values[0] = (amount 0..100, contrast 0..100, 0, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let contrast = 1.0 + uniforms.values[0].y / 100.0 * 0.8;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let l = dot(color.rgb, vec3f(0.299, 0.587, 0.114));

    // Bleach: heavily desaturated high-contrast luminance over the original.
    var silver = vec3f(l);
    silver = (silver - vec3f(0.5)) * contrast + vec3f(0.5);
    silver = clamp(mix(silver, vec3f(1.0), 0.25), vec3f(0.0), vec3f(1.0));

    // Screen-blend the silver layer.
    let screened = vec3f(1.0) - (vec3f(1.0) - color.rgb) * (vec3f(1.0) - silver);
    let outColor = clamp(mix(color.rgb, screened, amount), vec3f(0.0), vec3f(1.0));

    return vec4f(outColor, color.a);
}
