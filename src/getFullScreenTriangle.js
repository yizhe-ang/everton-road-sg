import { BufferGeometry, Float32BufferAttribute } from "three";

const getFullscreenTriangle = () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2)
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)
  );

  return geometry;
};

export default getFullscreenTriangle;
