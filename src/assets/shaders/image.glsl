// taken from penumbra.hackclub.com and edited

//
// This pass was adapted from Xor's CRT shader implementation.
// You can find it over at https://www.shadertoy.com/view/DtscRf! <3
//
// Bloom based on Xor's 1-pass blur: https://github.com/XorDev/1PassBlur
//

const float BLOOM_RADIUS = 16.0;
const float BLOOM_BASE = 0.7;
const float BLOOM_GLOW = 1.5;
const float SCREEN_VIGNETTE = 0.25;
const mat2 GOLDEN_ROT = mat2(0.7374, 0.6755, -0.6755, 0.7374);

uniform float iScrollProgress;

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    float t = min(1.0, iScrollProgress);

    float bloomBase = mix(1.0, BLOOM_BASE, t);
    float bloomGlow = mix(0.0, BLOOM_GLOW, t);

    vec2 res = iResolution.xy;
    vec2 texel = 1.0 / res;
    vec2 uv = (fragCoord / res) * 2.0 - 1.0;

    vec4 center = texture(iChannel0, fragCoord * texel) * bloomBase;
    vec4 bloom = vec4(0.0);
    float invSamples = 1.0 / BLOOM_SAMPLES;
    vec2 direction = vec2(1.0, 0.0);

    for (float i = 0.0; i < BLOOM_SAMPLES; i += 1.0) {
        direction *= -GOLDEN_ROT;

        float sampleT = (i + 0.5) * invSamples;
        float weight = 1.0 - sampleT * sampleT;
        vec2 coord = (fragCoord + direction * (sampleT * BLOOM_RADIUS)) * texel;

        bloom += texture(iChannel0, coord) * weight;
    }

    bloom = bloom * (bloomGlow * invSamples) + center;
    bloom.rgb = bloom.rgb / (bloom.rgb + 0.5);
    bloom.rgb *= 1.5;

    vec2 edge = max(1.0 - uv * uv, 0.0);
    float vignette = pow(edge.x * edge.y, SCREEN_VIGNETTE);
    bloom.rgb *= mix(0.7, 1.0, vignette);

    out_fragColor = bloom;
}
