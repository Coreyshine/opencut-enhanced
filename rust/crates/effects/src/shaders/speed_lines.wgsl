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

// speed-lines spec: values[0] = (amount 0..100, line count 20..120, speed, width 0..100)

fn sl_hash(n: vec2f) -> f32 { return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let lineCount = uniforms.values[0].y;
    let speed = uniforms.values[0].z;
    let lineWidth = 0.2 + uniforms.values[0].w / 100.0 * 0.8;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Radial anime speed lines from center.
    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let pos = (input.tex_coord - vec2f(0.5)) * aspect;
    let ang = atan2(pos.y, pos.x);
    let dist = length(pos) / length(vec2f(0.5) * aspect);

    let cell = floor((ang / 6.2831853 + 0.5) * lineCount);
    let rnd = sl_hash(vec2f(cell, 42.0));
    let hasLine = step(1.0 - amount * 0.7, rnd);
    let phase = fract((ang / 6.2831853 + 0.5) * lineCount);

    // Lines pulse outward.
    let moving = step(fract(rnd * 7.0 + time * speed * 0.5), 0.5 + dist * 0.5);
    let radial = smoothstep(0.3, 0.9, dist);
    let line = hasLine * moving * radial * lineWidth;

    return vec4f(color.rgb + vec3f(line), color.a);
}
