import { shaderMaterial } from "@react-three/drei";

export const TransitionMaterial = shaderMaterial(
  {
    uProgress: 0,
    uDisplacement: undefined,
    uTexture1: undefined,
    uTexture2: undefined,
    transition: 0,
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
    uniform sampler2D uTexture1;
    uniform sampler2D uTexture2;
    uniform float uProgress;
    uniform int transition;

    void main() {
      vec2 uv = vUv;

      // Perform displacement
      vec4 displacement = texture2D(uDisplacement, uv);

      float theta = displacement.r * 2. * PI;
      vec2 dir = vec2(sin(theta), cos(theta));

      uv += dir * displacement.r * 0.1;

      // Extract scene textures
      vec4 _texture = texture2D(uTexture1, uv);
      vec4 _texture2 = texture2D(uTexture2, uv);


      vec4 finalTexture;
      if (transition == 0) { // HORIZONTAL
       finalTexture = mix(_texture2, _texture, step(uProgress, uv.x));
      }
      if (transition == 1) { // VERTICAL
        finalTexture = mix(_texture2, _texture, step(uProgress, uv.y));
      }
      gl_FragColor = finalTexture;
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`
);
