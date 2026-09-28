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

// dream spec: values[0] = (amount 0..100, hue drift speed, brightness pulse, time)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let drift = uniforms.values[0].y;
    let pulse = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let texel = 1.0 / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Soft radial blur (4 taps toward center).
    let toCenter = (vec2f(0.5) - input.tex_coord) * 0.015 * amount;
    var blur = color;
    for (var i = 1.0; i <= 3.0; i += 1.0) {
        blur += textureSampleLevel(input_texture, input_sampler, input.tex_coord + toCenter * i, 0.0);
    }
    blur = blur / 4.0;

    // Hue drift via channel rotation.
    let rot = 0.5 + 0.5 * sin(time * drift);
    let dreamy = vec3f(blur.r * (1.0 + rot * 0.1), blur.g * (1.0 - rot * 0.05), blur.b * (1.0 + (1.0 - rot) * 0.12));
    let breathe = 1.0 + sin(time * 1.2) * pulse * 0.08;

    let outColor = mix(color.rgb, dreamy * breathe, amount);
    return vec4f(outColor, color.a);
}
