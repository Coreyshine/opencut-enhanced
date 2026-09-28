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

// bokeh spec: values[0] = (amount 0..100, speed, time seconds, unused)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Three drifting layers of soft bokeh discs.
    var glow = vec3f(0.0);
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let scale = 5.0 + layer * 3.0;
        let rise = time * speed * (0.03 + layer * 0.02);

        let cellUv = vec2f(input.tex_coord.x * scale, input.tex_coord.y * scale + rise * scale);
        let cell = floor(cellUv);
        let local = fract(cellUv) - vec2f(0.5);

        let rnd = hash(cell + vec2f(layer * 31.0));
        if (rnd > 0.55) {
            let center = vec2f(hash(cell + vec2f(3.0)) - 0.5, hash(cell + vec2f(7.0)) - 0.5) * 0.6;
            let dist = length(local - center);
            let discRadius = 0.18 + hash(cell + vec2f(11.0)) * 0.2;
            let disc = 1.0 - smoothstep(discRadius * 0.55, discRadius, dist);

            // Warm/cool tint per disc.
            let warm = hash(cell + vec2f(15.0));
            let tint = mix(vec3f(0.55, 0.75, 1.0), vec3f(1.0, 0.8, 0.5), warm);
            glow = glow + tint * disc * disc * (0.25 - layer * 0.06) * (0.7 + 0.3 * sin(time * 2.0 + rnd * 6.2831853));
        }
    }

    return vec4f(color.rgb + glow * amount * 2.0, color.a);
}
