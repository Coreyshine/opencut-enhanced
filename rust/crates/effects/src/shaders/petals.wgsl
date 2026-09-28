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

// petals spec: values[0] = (amount 0..100, speed, time, size)

fn pt_hash(n: vec2f) -> f32 { return fract(sin(dot(n, vec2f(45.164, 219.515))) * 43758.5453); }

fn petal_sdf(p: vec2f) -> f32 {
    // Petal: two circular lobes (split heart half).
    let d1 = length(p - vec2f(0.12, 0.0)) - 0.22;
    let d2 = length(p + vec2f(0.12, 0.0)) - 0.22;
    return min(d1, d2);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(0.5, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = vec3f(0.0);
    var mask = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 5.0 + layer * 4.0;
        let fall = time * speed * (0.15 + layer * 0.12);
        let sway = sin(time * (0.7 + layer * 0.4) + layer * 2.3) * 0.2;

        let uv = vec2f(input.tex_coord.x * scale + sway * scale, input.tex_coord.y * scale - fall * scale);
        let cell = floor(uv);
        let local = fract(uv) - vec2f(0.5);
        let rnd = pt_hash(cell + vec2f(layer * 23.0));
        if (rnd > 1.0 - amount * 0.3) {
            let off = vec2f((pt_hash(cell + vec2f(6.1)) - 0.5) * 0.6, (pt_hash(cell + vec2f(2.2)) - 0.5) * 0.6);
            let spin = time * (0.8 + rnd) + rnd * 6.28;
            let ca = cos(spin); let sa = sin(spin);
            let p = vec2f(ca * (local.x - off.x) - sa * (local.y - off.y), sa * (local.x - off.x) + ca * (local.y - off.y));
            let d = petal_sdf(p / (size * 0.35)) * (size * 0.35);
            let m = 1.0 - smoothstep(0.0, 0.04, d);
            // Pink palette variations.
            let tint = mix(vec3f(1.0, 0.7, 0.8), vec3f(1.0, 0.5, 0.65), rnd);
            acc += tint * m;
            mask = max(mask, m);
        }
    }

    return vec4f(mix(color.rgb, color.rgb + acc * 0.85, step(0.0, mask)), color.a);
}
