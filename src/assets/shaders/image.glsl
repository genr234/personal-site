// taken from penumbra.hackclub.com and edited

//
// This pass was adapted from Xor's CRT shader implementation.
// You can find it over at https://www.shadertoy.com/view/DtscRf! <3
//
// Bloom based on Xor's 1-pass blur: https://github.com/XorDev/1PassBlur
//

const float BLOOM_RADIUS  = 20.0;  // Slightly larger for softer falloff
const float BLOOM_BASE    = 0.65;  // Higher base for less aggressive bloom
const float BLOOM_GLOW    = 1.8;   // Reduced intensity for subtlety

uniform float iScrollProgress;

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    float t = min(1.00, iScrollProgress);

    float bloomBase = mix(1.00, BLOOM_BASE, t);
    float bloomGlow = mix(0.00, BLOOM_GLOW, t);

    vec2 res = iResolution.xy;
    vec2 texel = 1.0 / res;

    vec4 bloom = vec4(0);
    vec2 point = vec2(BLOOM_RADIUS, 0) * inversesqrt(BLOOM_SAMPLES);

    for (float i = 0.0; i < BLOOM_SAMPLES; i++) {
        // Rotate by golden angle for even distribution
        point *= -mat2(0.7374, 0.6755, -0.6755, 0.7374);

        // Compute sample coordinates
        vec2 coord = (fragCoord + point * sqrt(i)) * texel;

        // Softer falloff weight
        float weight = 1.0 - pow(i / BLOOM_SAMPLES, 0.8);
        bloom += texture(iChannel0, coord) * weight;
    }

    bloom *= bloomGlow / BLOOM_SAMPLES;
    bloom += texture(iChannel0, fragCoord / res) * bloomBase;

    // Gentle tone mapping for smoother result
    bloom.rgb = bloom.rgb / (bloom.rgb + 0.5);
    bloom.rgb *= 1.5;

    out_fragColor = bloom;
}
