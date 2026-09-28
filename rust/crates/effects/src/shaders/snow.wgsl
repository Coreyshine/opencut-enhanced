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

// snow spec: values[0] = (amount 0..100, speed, time seconds, size 1..10)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(1.0, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Three layers of parallax snowflakes (grid-hash based).
    var snow = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 24.0 + layer * 20.0;
        let fall = time * speed * (0.4 + layer * 0.35);
        let drift = sin(time * (0.5 + layer * 0.3)) * 0.06;

        let cellUv = vec2f(input.tex_coord.x * scale + drift * scale, input.tex_coord.y * scale + fall * scale);
        let cell = floor(cellUv);
        let local = fract(cellUv) - vec2f(0.5);

        // One flake per cell at a hashed offset.
        let rnd = hash(cell + vec2f(layer * 17.0));
        if (rnd > 1.0 - amount * 0.5) {
            let flakePos = vec2f((hash(cell + vec2f(5.0)) - 0.5) * 0.7, (hash(cell + vec2f(9.0)) - 0.5) * 0.7);
            let dist = length(local - flakePos);
            let radius = (0.05 + hash(cell) * 0.08) / (size * 0.35);
            snow = max(snow, (1.0 - smoothstep(radius * 0.5, radius, dist)) * (0.4 + layer * 0.3));
        }
    }

    return vec4f(color.rgb + vec3f(snow), color.a);
}
