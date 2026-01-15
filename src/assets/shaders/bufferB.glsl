// taken from penumbra.hackclub.com and edited

//
// This pass was adapted from Xor's CRT shader implementation.
// You can find it over at https://www.shadertoy.com/view/DtscRf! <3
//

const float SCREEN_VIGNETTE = 0.25;

uniform float iScrollProgress;

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord / res) * 2.0 - 1.0;

    vec4 color = texture(iChannel0, fragCoord / res);

    vec2 edge = max(1.0 - uv * uv, 0.0);
    float vignette = pow(edge.x * edge.y, SCREEN_VIGNETTE);
    
    color.rgb *= mix(0.7, 1.0, vignette);

    out_fragColor = color;
}
