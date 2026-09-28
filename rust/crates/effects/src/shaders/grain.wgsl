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

// grain spec: values[0] = (amount 0..100, size 1..20 px, seed any)

fn hash(point: vec2f) -> f32 {
    var p3 = fract(vec3f(point.x, point.y, point.x) * 0.1031);
    p3 = p3 + dot(p3, p3.yzx + vec3f(33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    var color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let amount = uniforms.values[0].x / 100.0;
    let size = max(1.0, uniforms.values[0].y);
    let seed = uniforms.values[0].z;

    let cell = floor(input.tex_coord * uniforms.resolution / size);
    let n = hash(cell + vec2f(seed * 37.0, seed * 91.0));
    let g = (n - 0.5) * amount * 0.5;

    return vec4f(color.rgb + vec3f(g), color.a);
}
