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

// lightning spec: values[0] = (frequency 0..100, intensity 0..100, time, seed)

fn bolt_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let frequency = max(0.5, uniforms.values[0].x / 100.0 * 3.0);
    let intensity = uniforms.values[0].y / 100.0;
    let time = uniforms.values[0].z;
    let seed = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Discrete flash windows: each cycle picks a random instant.
    let cycle = time * frequency + seed * 13.7;
    let cycleId = floor(cycle);
    let rnd = bolt_hash(vec2f(cycleId, seed));
    let flashTime = (cycle - cycleId) * (0.15 + rnd * 0.5);
    let flash = max(0.0, 1.0 - flashTime * 8.0) * step(0.35, rnd);

    // Double-flicker.
    let flicker = max(flash, max(0.0, 1.0 - abs(flashTime - 0.06) * 20.0) * 0.7);
    let brightness = flicker * intensity;

    // Simple jagged bolt: vertical path with hashed x offsets.
    var bolt = 0.0;
    if (brightness > 0.01) {
        let segments = 8.0;
        let sy = input.tex_coord.y * segments;
        let cell = floor(sy);
        let lx = fract(sy);
        let pathX = (bolt_hash(vec2f(cell, cycleId + seed)) * 0.6 + 0.2);
        let dist = abs(input.tex_coord.x - pathX);
        bolt = (1.0 - smoothstep(0.003, 0.012, dist)) * (1.0 - abs(lx - 0.5) * 0.4);
    }

    let flashColor = vec3f(0.85, 0.9, 1.0);
    return vec4f(color.rgb + flashColor * (brightness * 0.6 + bolt * brightness * 1.2), color.a);
}
