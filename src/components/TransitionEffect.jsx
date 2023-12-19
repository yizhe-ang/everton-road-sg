import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;

  void mainUv(inout vec2 uv) {
    uv = uv;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = inputColor;

    outputColor = inputColor;
  }
`;

export default class TransitionEffect extends Effect {
  constructor({ uProgress, uTexture1, uTexture2 }) {
    super("TransitionEffect", fragmentShader, {
      uniforms: new Map([
        ["uProgress", new Uniform(uProgress)],
        ["uTexture1", new Uniform(uTexture1)],
        ["uTexture2", new Uniform(uTexture2)],
      ]),
    });
  }
}
