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

// rain-window spec: values[0] = (drops 0..100, time, scale, blur 0..100)

fn rw_hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(93.9898, 67.345))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let drops = uniforms.values[0].x / 100.0;
    let time = uniforms.values[0].y;
    let scale = max(4.0, uniforms.values[0].z);
    let blurAmount = uniforms.values[0].w / 100.0;

    let aspect = vec2f(uniforms.resolution.x / uniforms.resolution.y, 1.0);
    let uv = vec2f(input.tex_coord.x * aspect.x, input.tex_coord.y) * scale;

    let cell = floor(uv);
    let local = fract(uv) - vec2f(0.5);

    let rnd = rw_hash(cell);
    let hasDrop = step(1.0 - drops * 0.35, rnd);
    // Drop slides down within its cell over time.
    let slide = fract(time * (0.15 + rnd * 0.25) + rnd * 7.0);
    let center = vec2f((rw_hash(cell + vec2f(1.0)) - 0.5) * 0.5, 0.5 - slide * 0.9);
    let dist = length((local - center) * vec2f(1.0, 0.8));

    let dropRadius = 0.22 + rnd * 0.12;
    let inDrop = 1.0 - smoothstep(dropRadius * 0.8, dropRadius, dist);
    // Refraction offset toward drop center, stronger at edge.
    let refract = normalize(center - local) * inDrop * 0.04;

    // Blurred background (soft sample spread).
    let texel = (1.0 + blurAmount * 2.0) / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    var bg = textureSampleLevel(input_texture, input_sampler, input.tex_coord + refract, 0.0);
    bg = (bg
        + textureSampleLevel(input_texture, input_sampler, input.tex_coord + refract + vec2f(texel.x, 0.0), 0.0)
        + textureSampleLevel(input_texture, input_sampler, input.tex_coord + refract - vec2f(texel.x, 0.0), 0.0)
        + textureSampleLevel(input_texture, input_sampler, input.tex_coord + refract + vec2f(0.0, texel.y), 0.0)
        + textureSampleLevel(input_texture, input_sampler, input.tex_coord + refract - vec2f(0.0, texel.y), 0.0)) / 5.0;

    // Drop highlight.
    let spec = inDrop * pow(max(0.0, 1.0 - dist / dropRadius), 3.0) * 0.15;
    return vec4f(bg.rgb + vec3f(spec), bg.a);
}
