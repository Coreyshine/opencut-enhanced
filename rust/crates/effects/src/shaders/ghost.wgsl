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

// ghost spec: values[0] = (amount 0..100, offset 0..100, count 1..5, time)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let offsetScale = uniforms.values[0].y / 100.0 * 0.08;
    let count = clamp(uniforms.values[0].z, 1.0, 5.0);
    let time = uniforms.values[0].w;

    let base = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    var acc = vec3f(0.0);
    var total = 0.0;
    let dir = vec2f(cos(time * 0.4), sin(time * 0.4));

    for (var i = 1.0; i <= count; i += 1.0) {
        let f = i / count;
        let off = dir * offsetScale * f;
        let g = textureSampleLevel(input_texture, input_sampler, input.tex_coord + off, 0.0).rgb;
        // Tint ghosts slightly cyan/magenta alternating.
        let tint = select(vec3f(0.8, 1.0, 1.1), vec3f(1.1, 0.8, 1.0), fract(i * 0.5) > 0.01);
        acc += g * tint * (1.0 - f * 0.7);
        total += 1.0 - f * 0.7;
    }

    let ghosted = (base.rgb * 1.2 + acc) / (1.0 + total * 0.55);
    return vec4f(mix(base.rgb, ghosted, amount), base.a);
}
