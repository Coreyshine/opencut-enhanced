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

// rain spec: values[0] = (amount 0..100, speed, angle degrees, time seconds)

fn hash(n: vec2f) -> f32 {
    return fract(sin(dot(n, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let amount = uniforms.values[0].x / 100.0;
    let speed = uniforms.values[0].y;
    let angle = uniforms.values[0].z * 3.14159265 / 180.0;
    let time = uniforms.values[0].w;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    // Rotate coords so streaks fall along the requested angle.
    let cosA = cos(angle);
    let sinA = sin(angle);
    let rotated = vec2f(
        input.tex_coord.x * cosA - input.tex_coord.y * sinA,
        input.tex_coord.x * sinA + input.tex_coord.y * cosA,
    );

    var rain = 0.0;
    for (var layer = 0.0; layer < 3.0; layer += 1.0) {
        let count = 60.0 + layer * 50.0;
        let fallSpeed = speed * (1.2 + layer * 0.5);
        let streakLen = 0.08 + layer * 0.03;

        let cellX = floor(rotated.x * count);
        let rndX = hash(vec2f(cellX, layer * 7.0));
        // Streak falls within its column; x wobble from the hash.
        let xWithin = fract(rotated.x * count) - 0.5;
        let fall = fract(rotated.y * (1.0 / streakLen) + time * fallSpeed + rndX * 10.0);

        // Thin vertical window + falling segment.
        let streak = (1.0 - smoothstep(0.06, 0.14, abs(xWithin))) * step(0.7, fall);
        rain = max(rain, streak * (0.25 + layer * 0.25) * amount * 2.0);
    }

    return vec4f(color.rgb + vec3f(rain * 0.9), color.a);
}
