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

// magnifier spec: values[0] = (center-x, center-y, radius, zoom)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let cx = uniforms.values[0].x;
    let cy = uniforms.values[0].y;
    let radius = clamp(uniforms.values[0].z, 0.05, 0.45);
    let zoom = max(1.2, uniforms.values[0].w);

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let pos = (input.tex_coord - vec2f(cx, cy)) * aspect;
    let dist = length(pos);

    var uv = input.tex_coord;
    let ring = smoothstep(radius - 0.004, radius + 0.004, dist);
    if (dist < radius) {
        // Zoomed sampling inside the lens.
        let zoomed = vec2f(cx, cy) + pos / zoom / aspect + vec2f(0.5) - vec2f(cx, cy);
        uv = vec2f(cx, cy) + (input.tex_coord - vec2f(cx, cy)) / zoom;
    }

    var color = textureSampleLevel(input_texture, input_sampler, uv, 0.0);

    // Lens rim highlight.
    let rim = 1.0 - smoothstep(0.0, 0.008, abs(dist - radius));
    color = mix(color, vec4f(1.0), rim * 0.8);

    return color;
}
