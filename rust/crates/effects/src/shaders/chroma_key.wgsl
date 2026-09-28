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

// chroma-key spec: values[0].xyz = key color rgb (0..1), values[0].w = similarity 0..100
//                  values[1] = (smoothness 0..100, spill 0..100, unused, unused)
// Chroma distance measured in (R-luma, B-luma) space so greenness/blue-ness
// dominates over luminance; spill suppression pulls the dominant channel back.

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let key = vec3f(uniforms.values[0].x, uniforms.values[0].y, uniforms.values[0].z);
    let similarity = uniforms.values[0].w / 100.0 * 0.5;
    let smoothness = uniforms.values[1].x / 100.0 * 0.5 + 0.01;
    let spill = uniforms.values[1].y / 100.0;

    let key_luma = dot(key, vec3f(0.2126, 0.7152, 0.0722));
    let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

    let key_chroma = vec2f(key.r - key_luma, key.b - key_luma);
    let chroma = vec2f(color.r - luma, color.b - luma);
    let distance = distance(chroma, key_chroma);

    let alpha = smoothstep(similarity, similarity + smoothness, distance);

    // Spill suppression: where the pixel is partially keyed, desaturate the
    // key channel excess back toward the other channels.
    var rgb = color.rgb;
    let spill_mask = (1.0 - alpha) * spill;
    if (key.g >= key.r && key.g >= key.b) {
        let excess = max(rgb.g - max(rgb.r, rgb.b), 0.0);
        rgb = vec3f(rgb.r, rgb.g - excess * spill_mask, rgb.b);
    } else if (key.b >= key.r) {
        let excess = max(rgb.b - max(rgb.r, rgb.g), 0.0);
        rgb = vec3f(rgb.r, rgb.g, rgb.b - excess * spill_mask);
    } else {
        let excess = max(rgb.r - max(rgb.g, rgb.b), 0.0);
        rgb = vec3f(rgb.r - excess * spill_mask, rgb.g, rgb.b);
    }

    return vec4f(mix(rgb, color.rgb, alpha), color.a * alpha);
}
