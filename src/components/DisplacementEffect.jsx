import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
  uniform sampler2D uDisplacement;

  void mainUv(inout vec2 uv) {
    vec4 displacement = texture2D(uDisplacement, uv);
    float theta = displacement.r * 2. * PI;

    vec2 dir = vec2(sin(theta), cos(theta));

    uv += dir * displacement.r * 0.1;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = inputColor;

    outputColor = inputColor;
  }
`;

export default class RippleEffect extends Effect {
  constructor({ uDisplacement }) {
    super("RippleEffect", fragmentShader, {
      uniforms: new Map([
        ['uDisplacement', new Uniform(uDisplacement) ]
      ])
    });
  }
}
