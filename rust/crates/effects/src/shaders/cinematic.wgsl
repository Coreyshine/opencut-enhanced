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

// cinematic spec: values[0] = (amount 0..100, contrast 0..100, warmth 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let contrast = 1.0 + uniforms.values[0].y / 100.0 * 0.5;
    let warmth = uniforms.values[0].z / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let luma = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
    // Push shadows toward teal, highlights toward orange.
    let shadowMask = 1.0 - smoothstep(0.0, 0.6, luma);
    let highMask = smoothstep(0.35, 1.0, luma);
    var graded = color.rgb;
    graded += vec3f(-0.10, 0.03, 0.12) * shadowMask * warmth;   // teal shadows
    graded += vec3f(0.14, 0.05, -0.08) * highMask * warmth;     // orange highlights

    // Contrast around mid grey.
    graded = (graded - vec3f(0.5)) * contrast + vec3f(0.5);

    // Subtle vignette for the filmic look.
    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let dist = length((input.tex_coord - vec2f(0.5)) * aspect);
    graded *= 1.0 - smoothstep(0.5, 0.95, dist) * 0.25 * amount;

    return vec4f(mix(color.rgb, clamp(graded, vec3f(0.0), vec3f(1.0)), amount), color.a);
}
