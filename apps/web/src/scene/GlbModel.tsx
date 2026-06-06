import { useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";

/**
 * Reusable loader for the GLB furniture/props.
 *
 * Downloaded GLB assets arrive at arbitrary scale, pivot and centring, so this
 * component auto-fits them:
 *  - measures the model's bounding box,
 *  - scales it so a chosen dimension equals a real-world target size,
 *  - re-centres it on X/Z and drops it so its base sits exactly on y = 0,
 *  - enables shadow casting/receiving on every mesh.
 *
 * Each placement gets its own lightweight clone (shared geometry + materials,
 * so many instances — e.g. the 30 room TVs — stay cheap on GPU memory).
 */

export type FitAxis = "x" | "y" | "z" | "max";

export interface GlbModelProps {
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  /** Scale so this axis of the model spans `size` metres. */
  fit?: { axis?: FitAxis; size: number };
  /** Explicit uniform scale (ignored when `fit` is given). */
  scale?: number;
  /** Sit the model's base on the floor (default) vs. centre it vertically. */
  onFloor?: boolean;
  /** Up-axis / orientation correction baked into the model before measuring
   *  (e.g. [-Math.PI/2, 0, 0] to stand up a Z-up Sketchfab export). */
  modelRotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Extra content rendered in the placement's (un-scaled) space, e.g. a screen. */
  children?: ReactNode;
}

export function GlbModel({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  fit,
  scale,
  onFloor = true,
  modelRotation = [0, 0, 0],
  castShadow = true,
  receiveShadow = true,
  children,
}: GlbModelProps) {
  const { scene } = useGLTF(url);

  // Clone (shares geometry/material), apply the orientation fix + shadows, then
  // measure the *corrected* bounds so scale and floor placement stay accurate.
  const { object, s, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.set(modelRotation[0], modelRotation[1], modelRotation[2]);
    clone.updateMatrixWorld(true);
    clone.traverse((o) => {
      const mesh = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; frustumCulled?: boolean };
      if (mesh.isMesh) {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        mesh.frustumCulled = true;
      }
    });

    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    let factor = scale ?? 1;
    if (fit) {
      const axis = fit.axis ?? "y";
      const span =
        axis === "x" ? size.x : axis === "z" ? size.z : axis === "max" ? Math.max(size.x, size.y, size.z) : size.y;
      factor = span > 0 ? fit.size / span : 1;
    }

    const off: [number, number, number] = [
      -center.x * factor,
      onFloor ? -box.min.y * factor : -center.y * factor,
      -center.z * factor,
    ];
    return { object: clone, s: factor, offset: off };
  }, [scene, fit?.axis, fit?.size, scale, onFloor, modelRotation[0], modelRotation[1], modelRotation[2], castShadow, receiveShadow]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={s} position={offset}>
        <primitive object={object} />
      </group>
      {children}
    </group>
  );
}

// --- Asset URLs (served from /public) -------------------------------------
export const GLB = {
  receptionDesk: "/models/reception_desk_diarama_optimized.glb",
  sofa: "/models/victorian_lounge_sofa_optimized.glb",
  coffeeTable: "/models/living_room_tables_optimized.glb",
  chair: "/models/gothic_chair_optimized.glb",
  plant: "/models/house_plant_optimized.glb",
  tvMain: "/models/sony_bravia_xr-77a80l_oled_tv_optimized.glb",
  tvRoom: "/models/tv_lg_oled_8k_optimized.glb",
} as const;

// NB: we deliberately do NOT eager-preload these heavy GLBs at import time —
// that would contend with the booth-critical PBR textures and delay first
// interaction. Each model loads on mount inside its own Suspense boundary.
