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

// spotlight spec: values[0] = (center-x 0..1, center-y 0..1, radius 0..1, softness)
// values[1] = (darkness 0..100, time, follow 0/1, 0)

fn scene_uv(uv: vec2f, time: f32, follow: f32) -> vec2f {
    if (follow < 0.5) { return uv; }
    // Slow orbit around the center when follow is on.
    let wobble = vec2f(sin(time * 0.8) * 0.08, cos(time * 0.6) * 0.06);
    return uv + wobble;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let cx = uniforms.values[0].x;
    let cy = uniforms.values[0].y;
    let radius = max(0.05, uniforms.values[0].z);
    let softness = clamp(uniforms.values[0].w, 0.02, 1.0);
    let darkness = uniforms.values[1].x / 100.0;
    let time = uniforms.values[1].y;
    let follow = uniforms.values[1].z;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let pos = (input.tex_coord - vec2f(0.5)) * aspect;
    let center = (scene_uv(vec2f(cx, cy), time, follow) - vec2f(0.5)) * aspect;

    let dist = length(pos - center);
    let lit = 1.0 - smoothstep(radius * (1.0 - softness), radius, dist);
    let factor = mix(1.0 - darkness, 1.0, lit);

    return vec4f(color.rgb * factor, color.a);
}
