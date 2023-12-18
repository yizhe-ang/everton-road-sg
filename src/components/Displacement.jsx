import DisplacementEffect from "./DisplacementEffect";
import { forwardRef } from "react";

export default forwardRef(function Displacement(props, ref) {
  const effect = new DisplacementEffect(props);

  return <primitive ref={ref} object={effect} />;
});
