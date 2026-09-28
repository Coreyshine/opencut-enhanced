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

// hearts spec: values[0] = (amount 0..100, speed, time, size)

fn hash24(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(53.7, 281.3))) * 43758.5453);
}

fn heart_sdf(p: vec2f) -> f32 {
    // Classic 2D heart SDF, p centered.
    let q = vec2f(p.x, -p.y + 0.35) * vec2f(1.0, 1.15);
    let a = q.x * q.x + q.y * q.y - 0.36;
    let b = sqrt(abs(q.x * q.x + q.y * q.y - 0.09)) - 0.36;
    return max(a, b) * sign(q.x * q.y);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(0.5, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 6.0 + layer * 4.0;
        let rise = time * speed * (0.2 + layer * 0.15);
        let sway = sin(time * (0.8 + layer * 0.5) + layer * 2.7) * 0.15;

        let uv = vec2f(input.tex_coord.x * scale + sway * scale, input.tex_coord.y * scale - rise * scale);
        let cell = floor(uv);
        let local = fract(uv) - vec2f(0.5);

        let rnd = hash24(cell + vec2f(layer * 11.0));
        if (rnd > 1.0 - amount * 0.3) {
            let off = vec2f((hash24(cell + vec2f(4.4)) - 0.5) * 0.55, (hash24(cell + vec2f(8.8)) - 0.5) * 0.55);
            let beat = 0.85 + 0.15 * sin(time * (2.0 + rnd * 3.0));
            let s = 0.35 / (size * 0.5) * beat;
            let d = heart_sdf((local - off) / s) * s;
            acc = max(acc, (1.0 - smoothstep(0.0, 0.05, d)) * (0.5 + layer * 0.25));
        }
    }

    let tint = vec3f(1.0, 0.35, 0.55);
    return vec4f(color.rgb + tint * acc, color.a);
}
