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

// color-adjust spec (packed in order):
//   values[0] = (exposure, brightness, contrast, saturation)
//   values[1] = (temperature, tint, hue, highlights)
//   values[2] = (sharpen, unused, unused, unused)
// Sliders are all -100..100 except sharpen (0..100).

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let texel_size = vec2f(1.0, 1.0) / uniforms.resolution;
    var color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);

    let u_exposure = uniforms.values[0].x;
    let u_brightness = uniforms.values[0].y;
    let u_contrast = uniforms.values[0].z;
    let u_saturation = uniforms.values[0].w;
    let u_temperature = uniforms.values[1].x;
    let u_tint = uniforms.values[1].y;
    let u_hue = uniforms.values[1].z;
    let u_highlights = uniforms.values[1].w;
    let u_shadows = uniforms.values[2].x;
    let u_sharpen = uniforms.values[2].y;

    if (u_sharpen != 0.0) {
        let amount = u_sharpen / 100.0 * 1.5;
        let blur_rgb = (
            textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(-texel_size.x, 0.0), 0.0).rgb
                + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(texel_size.x, 0.0), 0.0).rgb
                + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, -texel_size.y), 0.0).rgb
                + textureSampleLevel(input_texture, input_sampler, input.tex_coord + vec2f(0.0, texel_size.y), 0.0).rgb
        ) * 0.25;
        color = vec4f(color.rgb + (color.rgb - blur_rgb) * amount, color.a);
    }

    // Exposure in "stops": -100..100 maps to 0.5x..2x.
    color = vec4f(color.rgb * exp2(u_exposure / 100.0), color.a);
    color = vec4f(color.rgb + vec3f(u_brightness / 100.0 * 0.25), color.a);

    let temperature = u_temperature / 100.0;
    color = vec4f(color.rgb + vec3f(temperature * 0.10, 0.0, -temperature * 0.10), color.a);

    let tint = u_tint / 100.0;
    color = vec4f(color.rgb + vec3f(tint * 0.05, -tint * 0.10, tint * 0.05), color.a);

    let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
    let shadow_mask = pow(clamp(1.0 - luma, 0.0, 1.0), 2.0);
    let highlight_mask = pow(clamp(luma, 0.0, 1.0), 2.0);
    color = vec4f(color.rgb + shadow_mask * (u_shadows / 100.0 * 0.35), color.a);
    color = vec4f(color.rgb + highlight_mask * (u_highlights / 100.0 * 0.35), color.a);

    let contrast_factor = 1.0 + u_contrast / 100.0 * 0.8;
    color = vec4f((color.rgb - vec3f(0.5)) * contrast_factor + vec3f(0.5), color.a);

    let saturation_factor = 1.0 + u_saturation / 100.0;
    let luma2 = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
    color = vec4f(mix(vec3f(luma2), color.rgb, saturation_factor), color.a);

    if (u_hue != 0.0) {
        // SVG feColorMatrix hueRotate matrix (row-major below, passed as columns).
        let angle = u_hue * 3.14159265 / 180.0;
        let cos_a = cos(angle);
        let sin_a = sin(angle);
        let m = mat3x3f(
            vec3f(
                0.213 + 0.787 * cos_a - 0.213 * sin_a,
                0.213 - 0.213 * cos_a + 0.143 * sin_a,
                0.213 - 0.213 * cos_a - 0.787 * sin_a,
            ),
            vec3f(
                0.715 - 0.715 * cos_a - 0.715 * sin_a,
                0.715 + 0.285 * cos_a + 0.140 * sin_a,
                0.715 - 0.715 * cos_a + 0.715 * sin_a,
            ),
            vec3f(
                0.072 - 0.072 * cos_a + 0.928 * sin_a,
                0.072 - 0.072 * cos_a - 0.283 * sin_a,
                0.072 + 0.928 * cos_a + 0.072 * sin_a,
            ),
        );
        color = vec4f(m * color.rgb, color.a);
    }

    return clamp(color, vec4f(0.0), vec4f(1.0));
}
