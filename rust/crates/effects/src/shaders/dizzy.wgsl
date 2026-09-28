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

// dizzy spec: values[0] = (rotation 0..100, zoom pulse 0..100, speed, time)

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let rotation = uniforms.values[0].x / 100.0;
    let zoomPulse = uniforms.values[0].y / 100.0;
    let speed = uniforms.values[0].z;
    let time = uniforms.values[0].w;

    let angle = sin(time * speed) * rotation * 0.35;
    let zoom = 1.0 + sin(time * speed * 1.3) * zoomPulse * 0.12;

    let c = input.tex_coord - vec2f(0.5);
    let ca = cos(angle); let sa = sin(angle);
    let rotated = vec2f(ca * c.x - sa * c.y, sa * c.x + ca * c.y) / zoom + vec2f(0.5);

    return textureSampleLevel(input_texture, input_sampler, rotated, 0.0);
}
