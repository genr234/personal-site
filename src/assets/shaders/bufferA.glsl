// taken from penumbra.hackclub.com and edited

/*----------------------*\
|  > Constants           |
\*----------------------*/

const float CAMERA_FOV = 0.3;
const vec3  LIGHT_POS  = vec3(-2.0, 2.0, -1.0);

const float DEG2RAD     = PI / 180.0;
const float MAX_ANIM_SPEED  = 0.02;
const float MIN_ANIM_SPEED  = 0.01;

/*----------------------------*\
|  > Custom uniforms           |
\*----------------------------*/
uniform float iScrollProgress;

/*----------------------*\
|  > Utilities           |
\*----------------------*/

float clamp01(float x) { return clamp(x, 0.0, 1.0); }
vec3 clamp01(vec3 x)   { return clamp(x, 0.0, 1.0); }

// Smooth interpolation for morphing
float smoothBlend(float t) {
    return t * t * (3.0 - 2.0 * t);
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

vec3 transformTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xz, p.y);
    return q;
}

/*----------------------*\
|  > Color Palettes      |
\*----------------------*/

// Ocean/Teal - Deep blues, teals, aqua
vec3 paletteOcean(float t) {
    const vec3 a = vec3(0.2, 0.5, 0.6);
    const vec3 b = vec3(0.2, 0.3, 0.3);
    const vec3 c = vec3(1.0, 1.0, 1.0);
    const vec3 d = vec3(0.0, 0.1, 0.2);
    return a + b * cos(2.0 * PI * (c * t + d));
}

// Sunset/Warm - Oranges, pinks, purples
vec3 paletteSunset(float t) {
    const vec3 a = vec3(0.5, 0.3, 0.4);
    const vec3 b = vec3(0.5, 0.3, 0.3);
    const vec3 c = vec3(1.0, 0.8, 0.8);
    const vec3 d = vec3(0.0, 0.15, 0.3);
    return a + b * cos(2.0 * PI * (c * t + d));
}

// Forest/Nature - Greens, earth tones
vec3 paletteForest(float t) {
    const vec3 a = vec3(0.3, 0.45, 0.25);
    const vec3 b = vec3(0.2, 0.3, 0.2);
    const vec3 c = vec3(1.0, 1.0, 0.8);
    const vec3 d = vec3(0.0, 0.1, 0.15);
    return a + b * cos(2.0 * PI * (c * t + d));
}

// Aurora/Northern - Green, purple, blue ethereal
vec3 paletteAurora(float t) {
    const vec3 a = vec3(0.3, 0.5, 0.5);
    const vec3 b = vec3(0.4, 0.3, 0.4);
    const vec3 c = vec3(1.2, 1.0, 1.0);
    const vec3 d = vec3(0.1, 0.25, 0.4);
    return a + b * cos(2.0 * PI * (c * t + d));
}

// Neon/Vibrant - Bold, saturated modern colors
vec3 paletteNeon(float t) {
    const vec3 a = vec3(0.5, 0.4, 0.6);
    const vec3 b = vec3(0.5, 0.4, 0.4);
    const vec3 c = vec3(1.0, 1.0, 1.0);
    const vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(2.0 * PI * (c * t + d));
}

// Interpolate between two palettes
vec3 blendPalettes(float t, int from, int to, float blend) {
    vec3 colA, colB;
    
    if (from == 0) colA = paletteOcean(t);
    else if (from == 1) colA = paletteSunset(t);
    else if (from == 2) colA = paletteForest(t);
    else if (from == 3) colA = paletteAurora(t);
    else colA = paletteNeon(t);
    
    if (to == 0) colB = paletteOcean(t);
    else if (to == 1) colB = paletteSunset(t);
    else if (to == 2) colB = paletteForest(t);
    else if (to == 3) colB = paletteAurora(t);
    else colB = paletteNeon(t);
    
    return mix(colA, colB, smoothBlend(blend));
}

vec3 getPaletteColor(float t) {
    // iPalette encodes: current * 10 + target when transitioning
    int current = iPalette / 10;
    int target = iPalette - (current * 10);
    
    if (current == target || iMorphProgress <= 0.0) {
        // No transition
        if (current == 0) return paletteOcean(t);
        if (current == 1) return paletteSunset(t);
        if (current == 2) return paletteForest(t);
        if (current == 3) return paletteAurora(t);
        if (current == 4) return paletteNeon(t);
        return paletteOcean(t);
    }
    
    return blendPalettes(t, current, target, iMorphProgress);
}

/*----------------------*\
|  > SDF Primitives      |
\*----------------------*/

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Smoother, more organic displacement using multiple sine waves
float sdDisplacementOrganic(vec3 p, float time) {
    float d = 0.0;
    // Layer multiple frequencies for organic feel
    d += sin(1.5 * p.x + time * 0.05) * sin(1.8 * p.y + time * 0.03) * sin(1.5 * p.z + time * 0.04);
    d += 0.5 * sin(3.0 * p.x - time * 0.02) * sin(2.8 * p.y - time * 0.015) * sin(3.2 * p.z + time * 0.02);
    d += 0.25 * sin(5.0 * p.x + time * 0.01) * cos(4.5 * p.y) * sin(4.8 * p.z - time * 0.005);
    return d;
}

/*----------------------*\
|  > Scene               |
\*----------------------*/

float sdScene(vec3 p) {
    float t = iScrollProgress;
    float animSpeed = mix(MAX_ANIM_SPEED, MIN_ANIM_SPEED, clamp01(t));

    vec2 normMouse = iMouse.xy / iResolution.xy;
    float mouseDivisor = 12.0 + (t * 10000.0);

    vec3 torusPos = p;
    torusPos -= vec3(
        normMouse.x / mouseDivisor,
        normMouse.y / mouseDivisor,
        0.0
    );

    // Smoother rotation with organic movement
    float rotSpeed = iTime * animSpeed;
    torusPos = rotateX(torusPos, DEG2RAD * 20.0 + sin(iTime * 0.02) * 0.05);
    torusPos = rotateZ(torusPos, DEG2RAD * mod(-25.0 + rotSpeed, 360.0));
    
    // Gentle twist variation over time
    float twistAmount = 1.0 + (87.0 / 15.0) + sin(iTime * 0.03) * 0.3;
    torusPos = transformTwist(torusPos, twistAmount);

    float torusDist = sdTorus(torusPos, vec2(2.5, 1.0));
    float displacement = sdDisplacementOrganic(torusPos, iTime);

    return torusDist - (displacement / 12.0);
}

// Determines the distance to the scene
float raymarch(vec3 rayOrigin, vec3 rayDir, out float out_minDist) {
    float totalDist = 0.3;
    out_minDist = 1e9;

    for (int i = 0; i < RAYMARCH_MAX_ITERS; i++) {
        vec3 p = rayOrigin + (rayDir * totalDist);
        float dist = sdScene(p);
        totalDist += dist;
        out_minDist = min(dist, out_minDist);

        if (dist < RAYMARCH_HIT_CUTOFF)
            break;
        if (totalDist > RAYMARCH_MAX_DIST)
            break;
    }

    return totalDist;
}

void mainImage(out vec4 out_fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0, 0, -3);
    vec3 rd = normalize(vec3(uv * CAMERA_FOV, 1));

    float minDist;
    float dist = raymarch(ro, rd, minDist);

    vec3 color;

    if (dist > RAYMARCH_MAX_DIST) {
        // Soft glow for background
        float glowStrength = 1.0 - clamp01(minDist);
        glowStrength = pow(glowStrength, 1.5);
        color = getPaletteColor(minDist * 0.8) * glowStrength;
    } else {
        vec3 p = ro + (rd * dist);
        color = getPaletteColor(dist / 18.0 + iTime * 0.005);
    }

    // Subtle ambient glow
    float ambientGlow = exp(-minDist * 2.0) * 0.15;
    color += getPaletteColor(iTime * 0.01) * ambientGlow;

    out_fragColor = vec4(clamp01(color), 1);
}
