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

// thermal spec: values[0].x = intensity 0..100

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let intensity = uniforms.values[0].x / 100.0;
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let heat = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

    // False-color thermal ramp: black → blue → purple → red → orange → yellow → white.
    var thermal: vec3f;
    if (heat < 0.25) {
        thermal = mix(vec3f(0.0, 0.0, 0.15), vec3f(0.0, 0.2, 0.8), heat * 4.0);
    } else if (heat < 0.5) {
        thermal = mix(vec3f(0.35, 0.0, 0.7), vec3f(0.85, 0.05, 0.15), (heat - 0.25) * 4.0);
    } else if (heat < 0.75) {
        thermal = mix(vec3f(0.95, 0.35, 0.0), vec3f(1.0, 0.8, 0.0), (heat - 0.5) * 4.0);
    } else {
        thermal = mix(vec3f(1.0, 0.95, 0.4), vec3f(1.0, 1.0, 1.0), (heat - 0.75) * 4.0);
    }

    return vec4f(mix(color.rgb, thermal, intensity), color.a);
}
