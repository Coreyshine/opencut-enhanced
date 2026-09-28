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

// kaleidoscope spec: values[0].x = segments 2..12

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let segments = max(2.0, floor(uniforms.values[0].x));

    let centered = input.tex_coord - vec2f(0.5);
    var angle = atan2(centered.y, centered.x);
    let radius = length(centered);

    let sector = 6.2831853 / segments;
    angle = angle - sector * floor(angle / sector);
    // Mirror alternate sectors for a seamless kaleidoscope.
    angle = abs(angle - sector * 0.5);

    let uv = vec2f(0.5) + vec2f(cos(angle), sin(angle)) * radius;
    return textureSampleLevel(input_texture, input_sampler, uv, 0.0);
}
