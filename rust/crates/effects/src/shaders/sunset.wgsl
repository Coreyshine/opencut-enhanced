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

// sunset spec: values[0] = (amount 0..100, warmth 0..100, time, breathing 0/1)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let warmth = uniforms.values[0].y / 100.0;
    let time = uniforms.values[0].z;
    let breathing = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Warm gradient strongest toward top, breathing slowly.
    let breathe = 1.0 + breathing * 0.15 * sin(time * 0.5);
    let grad = pow(1.0 - input.tex_coord.y, 1.5) * breathe;

    let sunsetColor = vec3f(1.0, 0.45 + 0.15 * sin(time * 0.3), 0.2);
    let warmTint = vec3f(1.0, 0.72, 0.45);

    var outColor = color.rgb;
    outColor = mix(outColor, outColor * warmTint * 1.1 + warmTint * 0.06, warmth * 0.7);
    outColor = mix(outColor, sunsetColor, grad * amount * 0.45);

    return vec4f(outColor, color.a);
}
