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

// stars spec: values[0] = (amount 0..100, speed, time, size)

fn star_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(269.5, 183.3))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(0.5, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = 0.0;
    for (var layer = 0.0; layer < 2.0; layer += 1.0) {
        let scale = 40.0 + layer * 30.0;
        let twinkleSpeed = 1.5 + layer;
        let uv = vec2f(input.tex_coord.x * scale, input.tex_coord.y * scale);
        let cell = floor(uv);
        let local = fract(uv) - vec2f(0.5);
        let rnd = star_hash(cell + vec2f(layer * 17.0));
        if (rnd > 1.0 - amount * 0.5) {
            let off = vec2f((star_hash(cell + vec2f(5.0)) - 0.5) * 0.8, (star_hash(cell + vec2f(9.0)) - 0.5) * 0.8);
            let dist = length(local - off);
            let twinkle = 0.3 + 0.7 * abs(sin(time * (twinkleSpeed + rnd * 2.0) + rnd * 6.28));
            let radius = (0.05 + rnd * 0.1) / (size * 0.6);
            acc = max(acc, (1.0 - smoothstep(radius * 0.3, radius, dist)) * twinkle);
        }
    }

    return vec4f(color.rgb + vec3f(acc), color.a);
}
