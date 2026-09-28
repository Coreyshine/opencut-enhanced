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

// bubbles spec: values[0] = (amount 0..100, speed, time, size)

fn hash22(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(269.5, 183.3))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(0.5, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = 0.0;
    var hi = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 8.0 + layer * 5.0;
        let rise = time * speed * (0.25 + layer * 0.18);
        let wobble = sin(time * (0.9 + layer * 0.5) + layer * 3.0) * 0.12;

        let uv = vec2f(input.tex_coord.x * scale + wobble * scale, input.tex_coord.y * scale - rise * scale);
        let cell = floor(uv);
        let local = fract(uv) - vec2f(0.5);

        let rnd = hash22(cell + vec2f(layer * 13.0));
        if (rnd > 1.0 - amount * 0.3) {
            let off = vec2f((hash22(cell + vec2f(1.7)) - 0.5) * 0.6, (hash22(cell + vec2f(9.1)) - 0.5) * 0.6);
            let dist = length(local - off);
            let radius = (0.12 + hash22(cell) * 0.25) / (size * 0.4);
            let ring = smoothstep(radius, radius * 0.86, dist) - smoothstep(radius * 0.78, radius * 0.6, dist);
            acc = max(acc, ring * 0.55);
            // Specular dot.
            let spec = 1.0 - smoothstep(0.015, 0.03, length(local - off - vec2f(-radius * 0.35, radius * 0.35)));
            hi = max(hi, spec * step(dist, radius));
        }
    }

    let outColor = vec3f(color.rgb + vec3f(acc * 0.35 + hi * 0.6));
    return vec4f(outColor, color.a);
}
