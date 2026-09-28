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

// confetti spec: values[0] = (amount 0..100, speed, time, size)

fn hash21(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let time = uniforms.values[0].z;
    let size = max(0.5, uniforms.values[0].w);

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    var acc = vec3f(0.0);
    for (var layer = 0.0; layer < 2.0; layer += 1.0) {
        let cols = 30.0 + layer * 22.0;
        let rows = 18.0 + layer * 14.0;
        let fall = time * speed * (0.5 + layer * 0.4);
        let sway = sin(time * 1.4 + layer * 2.2) * 0.08;

        let cell = vec2f(
            floor(input.tex_coord.x * cols + sway * cols),
            floor(input.tex_coord.y * rows + fall * rows),
        );
        let local = fract(vec2f(
            input.tex_coord.x * cols + sway * cols,
            input.tex_coord.y * rows + fall * rows,
        )) - vec2f(0.5);

        let rnd = hash21(cell + vec2f(layer * 31.0, 7.0));
        if (rnd > 1.0 - amount * 0.35) {
            // Rotating rectangle confetto.
            let ang = time * (1.5 + rnd * 3.0) + rnd * 6.28;
            let ca = cos(ang); let sa = sin(ang);
            let p = vec2f(ca * local.x - sa * local.y, sa * local.x + ca * local.y);
            let half_ = vec2f(0.28, 0.12) / (size * 0.5);
            let inside = step(max(abs(p.x) - half_.x, abs(p.y) - half_.y), 0.0);
            // Palette by hash.
            let hue = fract(rnd * 7.0);
            let pal = clamp(abs(vec3f(hue * 6.0 - 2.0, 2.0, 4.0 - hue * 6.0) - 1.0), vec3f(0.0), vec3f(1.0));
            acc += pal * inside * (0.7 + layer * 0.3);
        }
    }

    return vec4f(color.rgb + acc, color.a);
}
