// taken from penumbra.hackclub.com and edited

/*----------------------*\
|  > Constants           |
\*----------------------*/

const float CAMERA_FOV = 0.3;
const vec3  LIGHT_POS  = vec3(-2.0, 2.0, -1.0);

const float DEG2RAD     = PI / 180.0;
const float MAX_ANIM_SPEED  = 1.0;
const float MIN_ANIM_SPEED  = 0.1;

// CRT & Retro effects
const float SCANLINE_INTENSITY = 0.08;
const float SCANLINE_FREQUENCY = 1.0;
const float PIXEL_SIZE = 2.0;
const float CRT_DISTORTION = 0.05;

/*----------------------------*\
|  > Custom uniforms           |
\*----------------------------*/
uniform float iScrollProgress;

/*----------------------*\
|  > Utilities           |
\*----------------------*/

float clamp01(float x) { return clamp(x, 0.0, 1.0); }
vec3 clamp01(vec3 x)   { return clamp(x, 0.0, 1.0); }

// CRT barrel distortion effect (subtle)
vec2 crtDistort(vec2 uv) {
    uv -= 0.5;
    float r2 = dot(uv, uv);
    uv *= 1.0 + r2 * CRT_DISTORTION;
    return uv + 0.5;
}

// Realistic scanline effect - thin horizontal lines
float scanline(vec2 coord) {
    return mix(1.0, 0.95, sin(coord.y * SCANLINE_FREQUENCY * 3.14159) * 0.5 + 0.5);
}

// CRT shadow mask pattern - realistic RGB triplet structure
float shadowMask(vec2 coord) {
    vec2 pixelCoord = mod(coord, PIXEL_SIZE);
    float x = pixelCoord.x / PIXEL_SIZE;

    // Create realistic RGB sub-pixel structure
    float mask = 1.0;
    if (x < 0.33) mask = 0.98;      // Red slightly brighter
    else if (x < 0.66) mask = 1.0;  // Green brightest
    else mask = 0.96;                // Blue slightly dimmer

    return mask;
}

// Pixel grid border effect - shows pixel boundaries naturally
float pixelGrid(vec2 coord) {
    vec2 pixelPos = mod(coord, PIXEL_SIZE);
    float edge = smoothstep(0.95, 1.0, max(pixelPos.x, pixelPos.y));
    return mix(1.0, 0.97, edge * 0.3);
}

vec3 rotateX(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateZ(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

void partialLerp(inout vec3 current, vec3 to, inout float t) {
    if (t > 1.0) {
        t -= 1.0;
        current = to;
        return;
    }

    if (t < 0.0) {
        return;
    }

    current = mix(current, to, t);
    t = -1.0;
}

/*----------------------*\
|  > Rendering           |
\*----------------------*/

float sdSphere(vec3 p, float scale) {
    p /= scale;
    return (length(p) - 1.0) * scale;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdDisplacement(vec3 p) {
    return (
    sin(2.0 * p.x) *
    sin(2.4 * p.y) *
    sin(2.0 * p.z)
    );
}

vec3 transformTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xz, p.y);
    return q;
}

// Gets the signed distance of the scene.
float sdScene(vec3 p) {

    //float t = iTime / 10.0;
    // -iMouse.z / 640.0
    float t = iScrollProgress;
    float animSpeed = mix(MAX_ANIM_SPEED, MIN_ANIM_SPEED, clamp01(t));

    vec2 normMouse = iMouse.xy / iResolution.xy;
    float mouseDivisor = 12.0 + (t * 10000.0);

    // Torus offset based on scroll position
    vec3 torusPagePos = vec3(0.0, 0.0, 0.0);
    partialLerp(torusPagePos, vec3(4.0, 0.0, 0.0), t);
    partialLerp(torusPagePos, vec3(4.5, 0.0, 0.0), t);

    vec3 torusPos = p;
    torusPos -= vec3(
    normMouse.x / mouseDivisor + torusPagePos.x,
    normMouse.y / mouseDivisor + torusPagePos.y,
    torusPagePos.z
    );

    torusPos = rotateX(torusPos, DEG2RAD * 20.0);
    torusPos = rotateZ(torusPos, DEG2RAD * mod( (-25.0 + (iTime * animSpeed)), 360.0 ));
    torusPos = transformTwist(torusPos, 1.00 + (87.0 / 15.0));

    float torusDist = sdTorus(torusPos, vec2(2.5, 1.0));
    float displacement = sdDisplacement(torusPos);

    return torusDist - (displacement / 5.0);
}

// Determines the distance to the scene, starting from the origin, in the given direction.
// If nothing was hit, a value higher than RAYMARCH_MAX_DIST is returned.
// out_minDist holds the smallest distance from the ray to the scene. This variable can be used to e.g. create glow.
float raymarch(vec3 rayOrigin, vec3 rayDir, out float out_minDist) {
    float totalDist = 0.3;

    out_minDist = 1e9; // arbitrarily large value

    for (int i = 0; i < RAYMARCH_MAX_ITERS; i++) {
        vec3 p = rayOrigin + (rayDir * totalDist); // position along the ray

        float dist = sdScene(p); // current distance to the scene
        totalDist += dist;

        out_minDist = min(dist, out_minDist);

        if (dist < RAYMARCH_HIT_CUTOFF)
        break; // early stop if close enough

        if (totalDist > RAYMARCH_MAX_DIST)
        break; // early stop if too far
    }

    return totalDist;
}

vec3 palette(float t) {
    // Retro CRT palette - natural and clean
    const vec3 a = vec3(0.65, 0.5, 0.8);   // base purple
    const vec3 b = vec3(0.35, 0.25, 0.35); // subtle variation
    const vec3 c = vec3(0.7, 0.9, 0.7);    // frequency
    const vec3 d = vec3(0.1, 0.2, 0.3);    // phase

    return a + b * cos(2.0 * PI * (c * t + d));
}

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    // Apply CRT distortion to UV coordinates
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    uv = crtDistort(uv);

    vec2 screenUv = fragCoord.xy / iResolution.xy;

    vec3 ro = vec3(0, 0, -3);
    vec3 rd = normalize(vec3(uv * CAMERA_FOV, 1));

    float minDist;
    float dist = raymarch(ro, rd, /* out */ minDist);

    vec3 color;

    if (dist > RAYMARCH_MAX_DIST) {
        // We didn't hit anything.
        float glowStrength = 1.0 - clamp01(minDist);
        color = palette(minDist) * glowStrength;
    } else {
        vec3 p = ro + (rd * dist);
        color = palette(dist / 16.0);
    }

    // Apply CRT effects - clean and realistic
    float scan = scanline(fragCoord);
    float mask = shadowMask(fragCoord);
    float grid = pixelGrid(fragCoord);

    // Apply scanline darkening subtly
    color *= scan;

    // Apply shadow mask (RGB sub-pixel variation)
    color *= mask;

    // Apply pixel grid subtly
    color *= grid;

    out_fragColor = vec4(clamp01(color), 1);
}
