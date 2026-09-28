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

// aurora spec: values[0] = (amount 0..100, speed, time, hue 0..100)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let hueShift = uniforms.values[0].w / 100.0;
    let t = uniforms.values[0].z * speed * 10.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let uv = input.tex_coord * aspect * 3.0;

    var aurora = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let waveY = 0.5
            + 0.18 * sin(uv.x * (1.5 + layer) + t * (0.6 + layer * 0.3) + layer * 2.1)
            + 0.1 * sin(uv.x * (3.0 + layer * 2.0) - t * (0.9 + layer * 0.2));
        let d = input.tex_coord.y - waveY;
        let curtain = exp(-abs(d) * (14.0 + layer * 6.0));
        aurora += curtain * (0.5 + 0.5 * sin(uv.x * 6.0 + t * 1.3 + layer));
    }

    let green = vec3f(0.2, 1.0, 0.55);
    let purple = vec3f(0.55, 0.3, 1.0);
    let teal = vec3f(0.2, 0.8, 1.0);
    let col = mix(mix(green, purple, hueShift), teal, 0.3 + 0.3 * sin(t));

    return vec4f(color.rgb + col * aurora * amount * 0.7, color.a);
}
