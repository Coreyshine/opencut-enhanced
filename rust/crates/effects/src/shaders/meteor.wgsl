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

// meteor spec: values[0] = (frequency, intensity, time, trail length)

fn mt_hash(n: vec2f) -> f32 { return fract(sin(dot(n, vec2f(93.9898, 67.345))) * 43758.5453); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let frequency = max(0.2, uniforms.values[0].x / 100.0 * 1.5);
    let intensity = uniforms.values[0].y / 100.0;
    let time = uniforms.values[0].z;
    let trail = 0.1 + uniforms.values[0].w / 100.0 * 0.4;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // One meteor per cycle: diagonal streak crossing the frame.
    let cycle = floor(time * frequency);
    let rnd = mt_hash(vec2f(cycle, 3.0));
    let phase = fract(time * frequency);
    // Meteor position sweeps diagonally.
    let prog = phase * 1.6 - 0.3;
    let mx = mix(-0.1, 1.1, prog);
    let my = mix(1.1, -0.1, prog);
    let dir = normalize(vec2f(1.0, -1.0));

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let pos = (input.tex_coord - vec2f(mx, my)) * aspect;
    let along = dot(pos, dir);
    let perp = abs(pos.x * dir.y - pos.y * dir.x);

    let head = smoothstep(0.0, -trail, along) * (1.0 - smoothstep(0.0, 0.04, perp));
    let core = (1.0 - smoothstep(0.0, 0.008, perp)) * step(along, 0.0) * (1.0 - smoothstep(-0.02, 0.0, along));
    let flicker = 0.7 + 0.3 * mt_hash(vec2f(time, cycle));

    let glow = clamp(head * intensity + core * intensity * 1.5, 0.0, 1.5) * flicker;
    return vec4f(color.rgb + vec3f(1.0, 0.98, 0.85) * glow, color.a);
}
