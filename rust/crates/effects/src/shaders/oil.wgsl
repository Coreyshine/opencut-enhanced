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

// oil spec: values[0] = (radius 1..6, mix 0..100, 0, 0)

fn lum(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let radius = max(1.0, uniforms.values[0].x);
    let mixAmount = uniforms.values[0].y / 100.0;

    let texel = radius / vec2f(uniforms.resolution.x, uniforms.resolution.y);
    var bestMean = vec3f(0.0);
    var bestVar = 1e6;

    // 4 quadrants: pick the flattest region's mean color (Kuwahara-style).
    for (var q = 0.0; q < 4.0; q += 1.0) {
        let dir = vec2f(select(-1.0, 1.0, q >= 2.0), select(-1.0, 1.0, q == 0.0 || q == 3.0));
        var mean = vec3f(0.0);
        var var2 = vec3f(0.0);
        let n = 4.0;
        for (var j = 0.0; j < n; j += 1.0) {
            for (var i = 0.0; i < n; i += 1.0) {
                let s = textureSampleLevel(
                    input_texture,
                    input_sampler,
                    input.tex_coord + dir * vec2f(i, j) * texel * 0.7,
                    0.0,
                ).rgb;
                mean += s;
            }
        }
        mean = mean / (n * n);
        for (var j = 0.0; j < n; j += 1.0) {
            for (var i = 0.0; i < n; i += 1.0) {
                let s = textureSampleLevel(
                    input_texture,
                    input_sampler,
                    input.tex_coord + dir * vec2f(i, j) * texel * 0.7,
                    0.0,
                ).rgb;
                var2 += (s - mean) * (s - mean);
            }
        }
        let v = var2.r + var2.g + var2.b;
        if (v < bestVar) {
            bestVar = v;
            bestMean = mean;
        }
    }

    let color = textureSampleLevel(input_texture, input_sampler, input.tex_coord, 0.0);
    // Boost saturation slightly for the painted feel.
    let l = lum(bestMean);
    let painted = bestMean + (bestMean - vec3f(l)) * 0.35;
    return vec4f(mix(color.rgb, painted, mixAmount), color.a);
}
