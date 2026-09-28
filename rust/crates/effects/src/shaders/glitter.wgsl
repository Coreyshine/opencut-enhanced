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

// glitter spec: values[0] = (amount 0..100, speed, time seconds, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Two scales of twinkling star sparkles.
    var sparkle = 0.0;
    for (var layer = 0.0; layer < 2.0; layer += 1.0) {
        let scale = 40.0 + layer * 55.0;
        let cellUv = input.tex_coord * scale;
        let cell = floor(cellUv);
        let local = fract(cellUv) - vec2f(0.5);

        let rnd = hash(cell + vec2f(layer * 13.0));
        if (rnd > 1.0 - amount * 0.35) {
            let starPos = (vec2f(hash(cell + vec2f(1.0)), hash(cell + vec2f(2.0))) - vec2f(0.5)) * 0.8;
            let dist = length(local - starPos);
            // Twinkle: each star flashes on a hashed phase.
            let phase = rnd * 6.2831853;
            let twinkle = pow(max(0.0, sin(time * speed * 3.0 + phase)), 6.0);
            let star = (1.0 - smoothstep(0.0, 0.18 + layer * 0.1, dist)) * twinkle;
            sparkle = max(sparkle, star);
        }
    }

    return vec4f(color.rgb + vec3f(sparkle), color.a);
}
