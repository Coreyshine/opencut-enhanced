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

// cross-hatch spec: values[0] = (spacing px 4..40, intensity 0..100, unused, unused)

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

// One set of hatch lines along a given rotation.
fn hatchLine(uv: vec2f, resolution: vec2f, spacing: f32, rotation: f32) -> f32 {
    let cosR = cos(rotation);
    let sinR = sin(rotation);
    let coord = vec2f(uv.x * cosR - uv.y * sinR, uv.x * sinR + uv.y * cosR) * resolution.y / spacing;
    let line = abs(fract(coord.y) - 0.5) * 2.0;
    return 1.0 - smoothstep(0.35, 0.55, line);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let spacing = max(4.0, uniforms.values[0].x);
    let intensity = uniforms.values[0].y / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let brightness = luma(color.rgb);

    // Progressive hatch layers: darker areas get more line directions.
    const pi2 = 1.5707963;
    var ink = 0.0;
    if (brightness < 0.85) { ink = max(ink, hatchLine(input.tex_coord, uniforms.resolution, spacing, 0.0)); }
    if (brightness < 0.6) { ink = max(ink, hatchLine(input.tex_coord, uniforms.resolution, spacing, pi2)); }
    if (brightness < 0.4) { ink = max(ink, hatchLine(input.tex_coord, uniforms.resolution, spacing, pi2 * 0.5)); }
    if (brightness < 0.2) { ink = max(ink, hatchLine(input.tex_coord, uniforms.resolution, spacing, pi2 * 1.5)); }

    let paper = vec3f(0.97);
    let result = mix(mix(paper, color.rgb, 0.25), vec3f(0.1), ink * intensity);
    return vec4f(result, color.a);
}
