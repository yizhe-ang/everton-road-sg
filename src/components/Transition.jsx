import TransitionEffect from "./TransitionEffect";
import { forwardRef } from "react";

export default forwardRef(function Transition(props, ref) {
  const effect = new TransitionEffect(props);

  return <primitive ref={ref} object={effect} />;
});
