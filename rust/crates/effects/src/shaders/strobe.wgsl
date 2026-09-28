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

// strobe spec: values[0] = (speed 0..100, invert 0/1, intensity 0..100, 0)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let speed = max(0.5, uniforms.values[0].x / 100.0 * 12.0);
    let doInvert = uniforms.values[0].y;
    let intensity = uniforms.values[0].z / 100.0;
    let time = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let phase = floor(time * speed);
    let flash = fract(phase * 0.61803) ; // Golden-ratio hashed pattern.
    let on = step(0.5, flash);

    var outColor = color.rgb;
    if (doInvert > 0.5 && on > 0.5) {
        outColor = vec3f(1.0) - outColor;
    }
    let brighten = on * intensity * 0.5;
    outColor = mix(outColor, outColor + vec3f(brighten), intensity);

    return vec4f(outColor, color.a);
}
