import { shaderMaterial } from "@react-three/drei";

export const TransitionMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uDisplacement: undefined,
    uDisplacementStrength: 0,
    uTexture1: undefined,
    uTexture2: undefined,
  },
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  /*glsl*/ `
    #define PI 3.1415926535897932384626433832795

    varying vec2 vUv;
    uniform sampler2D uDisplacement;
    uniform float uDisplacementStrength;
    uniform sampler2D uTexture1;
    uniform sampler2D uTexture2;
    uniform float uProgress;
    uniform float uTime;

    vec2 mirrored(vec2 v) {
      vec2 m = mod(v, 2.);
      return mix(m, 2.0 - m, step(1.0, m));
    }

    float tri(float p) {
      return mix(p, 1.0 - p, step(0.5, p)) * 2.;
    }

    void main() {
      vec2 uv = vUv;

      // Perform displacement
      vec4 displacement = texture2D(uDisplacement, uv);

      float theta = displacement.r * 2. * PI;
      vec2 dir = vec2(sin(theta), cos(theta));

      uv += dir * displacement.r * 0.1 * uDisplacementStrength;

      // Extract scene textures
      vec4 tex1 = texture2D(uTexture1, uv);
      vec4 tex2 = texture2D(uTexture2, uv);

      // Transition animation
      float p = uProgress;
      float delayValue = p * 7. - uv.y * 2. + uv.x - 2.;
      delayValue = clamp(delayValue, 0., 1.);

      float accel = 0.1;

      vec2 translateValue = vec2(p) + delayValue * accel;
      vec2 translateValue1 = vec2(-0.5, 1.) * translateValue;
      vec2 translateValue2 = vec2(-0.5, 1.) * (translateValue - 1. - accel);

      vec2 w = sin(sin(uTime) * vec2(0., 0.3) + uv.yx * vec2(0., 4.)) * vec2(0., 0.5);
      vec2 xy = w * (tri(p) * 0.5 + tri(delayValue) * 0.5);

      vec2 uv1 = uv + translateValue1 + xy;
      vec2 uv2 = uv + translateValue2 + xy;

      vec4 rgba1 = texture2D(uTexture1, mirrored(uv1));
      vec4 rgba2 = texture2D(uTexture2, mirrored(uv2));

      vec4 rgba = mix(rgba1, rgba2, delayValue);

      gl_FragColor = rgba;

      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`
);
