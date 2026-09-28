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

// fireflies spec: values[0] = (amount 0..100, speed, time, glow)

fn hash23(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let glow = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = vec3f(0.0);
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 10.0 + layer * 6.0;
        let drift = time * speed * (0.12 + layer * 0.08);
        let uv = vec2f(
            input.tex_coord.x * scale + sin(time * (0.5 + layer * 0.4) + layer) * 0.3,
            input.tex_coord.y * scale + cos(time * (0.4 + layer * 0.3) + layer * 2.0) * 0.3 - drift * scale * 0.15,
        );
        let cell = floor(uv);
        let local = fract(uv) - vec2f(0.5);
        let rnd = hash23(cell + vec2f(layer * 19.0));
        if (rnd > 1.0 - amount * 0.28) {
            let off = vec2f((hash23(cell + vec2f(3.3)) - 0.5) * 0.7, (hash23(cell + vec2f(7.7)) - 0.5) * 0.7);
            // Blinking.
            let blink = 0.35 + 0.65 * abs(sin(time * (1.2 + rnd * 2.0) + rnd * 6.28));
            let dist = length(local - off);
            let core = 1.0 - smoothstep(0.0, 0.06, dist);
            let halo = 1.0 - smoothstep(0.0, (0.12 + glow * 0.1), dist);
            acc += vec3f(1.0, 0.92, 0.45) * (core + halo * 0.5) * blink;
        }
    }

    return vec4f(color.rgb + acc, color.a);
}
