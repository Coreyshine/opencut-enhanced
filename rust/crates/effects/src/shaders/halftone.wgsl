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

// halftone spec: values[0] = (dot size px 2..40, intensity 0..100, unused, unused)

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let dotSize = max(2.0, uniforms.values[0].x);
    let intensity = uniforms.values[0].y / 100.0;

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    let brightness = luma(color.rgb);

    // Distance to the center of the nearest halftone cell.
    let cell = input.tex_coord * uniforms.resolution / dotSize;
    let cellCenter = (floor(cell) + vec2f(0.5)) * dotSize;
    let dist = distance(input.tex_coord * uniforms.resolution, cellCenter);

    // Dot radius shrinks as brightness rises (white = no dot).
    let maxRadius = dotSize * 0.7071;
    let dotRadius = (1.0 - brightness) * maxRadius * 0.75;

    let dot = 1.0 - smoothstep(dotRadius - 0.5, dotRadius + 0.5, dist);
    // White paper + ink dots blended by intensity.
    let halftone = mix(color.rgb, vec3f(1.0) * (1.0 - dot), intensity);
    return vec4f(halftone, color.a);
}
