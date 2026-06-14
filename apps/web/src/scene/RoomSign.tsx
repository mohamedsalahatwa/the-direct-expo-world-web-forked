import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ExtrudeGeometry, MathUtils, MeshStandardMaterial, Shape, type Group } from "three";
import { makeText3D } from "./brand3d";

/**
 * Floating "showroom logo" above a room: a slanted-top banner plaque — the same
 * silhouette as the central Byit monument — finished in the room's own accent
 * colour, with the developer name as raised, extruded 3D lettering (the very
 * same makeText3D treatment as the monument's "BYIT" word).
 *
 *  - Banner plaque: an extruded, bevelled slab tinted with the room colour
 *    (`glow`), lightly emissive so it reads as "lit" without postprocessing.
 *  - The name is mounted on BOTH faces (front + back) so it stays readable as
 *    the plaque spins a full 360°. Each name is auto-scaled to a single line
 *    that fits inside the banner, exactly like the "BYIT" lettering.
 *  - Animated entirely in useFrame via refs (no React state → no re-renders):
 *      • slow vertical float,
 *      • a continuous 360° spin about Y (see SPIN_SPEED),
 *      • a smooth fade-in (plaque + lettering opacity + emissive + a slight rise
 *        & scale settle) the first ~1.4 s after it mounts.
 *
 * Drop it inside a room's group so it inherits the room's position/rotation and
 * travels with it.
 */

const PLAQUE_COLOR = "#D9822B"; // default banner tint (overridden by `glow`)
const NAME_COLOR = "#1c3556"; // deep navy lettering

// Banner silhouette (slanted top — tall right edge, shorter left edge), centred
// on the origin so it spins/floats about its own middle. Mirrors ByitLogo.
const HALF_W = 1.85;
const H_RIGHT = 1.5;
const H_LEFT = 1.05;
const DEPTH = 0.3;
const BEVEL = 0.05; // bevel thickness/size on the extruded plaque
const MID_Y = (H_RIGHT + H_LEFT) / 4;
// Push the lettering clear of the plaque's beveled front face (DEPTH/2 + BEVEL),
// otherwise the text is buried inside the slab and never shows.
const NAME_Z = DEPTH / 2 + BEVEL + 0.08;
const NAME_Y = 0.05; // sit on the plaque's visual midline

// Name geometry build size + the box it must fit inside the banner.
const NAME_BASE_SIZE = 0.6; // cap height before fit-scaling (≈ the BYIT word)
const NAME_FIT_W = 2 * HALF_W * 0.8; // usable plaque width
const NAME_FIT_H = H_LEFT * 0.62; // keep within the shorter (left) side

const FADE_SECONDS = 1.4;
const FLOAT_AMP = 0.06; // metres
const FLOAT_SPEED = 0.8; // rad/s
const SPIN_SPEED = 0.6; // rad/s — full continuous 360° rotation (~10.5 s/turn)
const PEAK_EMISSIVE = 0.35;
const NAME_PEAK_EMISSIVE = 0.18; // gentle self-lift so navy reads on dark plaques

/** Slanted-top banner outline, centred on the origin. */
function bannerShape(): Shape {
  const s = new Shape();
  s.moveTo(-HALF_W, -MID_Y);
  s.lineTo(HALF_W, -MID_Y);
  s.lineTo(HALF_W, H_RIGHT - MID_Y);
  s.lineTo(-HALF_W, H_LEFT - MID_Y);
  s.closePath();
  return s;
}

export interface RoomSignProps {
  /** The room/developer name to display. */
  text: string;
  /** Sign height above the room floor, in metres (clear of the walls). */
  height?: number;
  /** Overall scale of the plaque (1 ≈ a ~3.7 m banner). */
  size?: number;
  /** Z offset toward the room opening so the sign reads from the front. */
  z?: number;
  /** Accent tint of the plaque (defaults to warm orange). */
  glow?: string;
}

function RoomSignImpl({ text, height = 3.35, size = 0.42, z = 0.35, glow }: RoomSignProps) {
  const group = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);

  // The whole banner is scaled to `size` (the central monument is ~1); a booth
  // sign is much smaller, so the default scale keeps it clear of the 2.6 m wall.
  const baseScale = size / 0.42;

  // Extruded banner with a soft bevel, centred on Z. Rebuilt only if it remounts.
  const plaqueGeo = useMemo(() => {
    const geo = new ExtrudeGeometry(bannerShape(), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 3,
      curveSegments: 4,
    });
    geo.translate(0, 0, -DEPTH / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Raised, extruded 3D name — the same treatment as the central "BYIT" word.
  const nameGeo = useMemo(() => makeText3D(text, { size: NAME_BASE_SIZE, depth: 0.14, bevel: 0.012 }), [text]);
  useEffect(() => () => nameGeo.dispose(), [nameGeo]);

  // Shrink the (single-line) name uniformly so it always fits the banner.
  const nameScale = useMemo(() => {
    nameGeo.computeBoundingBox();
    const bb = nameGeo.boundingBox;
    if (!bb) return 1;
    const w = bb.max.x - bb.min.x || 1;
    const h = bb.max.y - bb.min.y || 1;
    return Math.min(1, NAME_FIT_W / w, NAME_FIT_H / h);
  }, [nameGeo]);

  // One plaque material per sign (cheap; lets each fade from its own mount time
  // as booths stream in). Memoised so it survives re-renders without rebuilding.
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(glow ?? PLAQUE_COLOR),
        metalness: 0.25,
        roughness: 0.42,
        emissive: new Color(glow ?? PLAQUE_COLOR),
        emissiveIntensity: 0, // ramped in during fade-in
        envMapIntensity: 1.0,
        transparent: true,
        opacity: 0,
      }),
    [glow],
  );

  // Navy lettering material (matches the BYIT word's finish), with a touch of
  // self-emissive so the dark navy stays legible on darker plaque colours.
  const nameMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(NAME_COLOR),
        emissive: new Color(NAME_COLOR),
        emissiveIntensity: 0, // ramped in during fade-in
        roughness: 0.34,
        metalness: 0.12,
        envMapIntensity: 1.1,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  useEffect(() => () => {
    material.dispose();
    nameMaterial.dispose();
  }, [material, nameMaterial]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const now = state.clock.elapsedTime;
    if (startedAt.current === null) startedAt.current = now;
    const age = now - startedAt.current;

    // Fade-in: easeOutCubic on opacity + emissive, with a small rise & scale settle.
    const p = MathUtils.clamp(age / FADE_SECONDS, 0, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    material.opacity = ease;
    material.emissiveIntensity = PEAK_EMISSIVE * ease;
    nameMaterial.opacity = ease;
    nameMaterial.emissiveIntensity = NAME_PEAK_EMISSIVE * ease;
    g.scale.setScalar(baseScale * (0.92 + 0.08 * ease));

    // Continuous, elegant idle motion.
    g.position.y = height + Math.sin(now * FLOAT_SPEED) * FLOAT_AMP - (1 - ease) * 0.15;
    // Full continuous 360° spin about Y.
    g.rotation.y = now * SPIN_SPEED;
  });

  return (
    <group ref={group} position={[0, height, z]}>
      {/* coloured banner plaque (room accent) */}
      <mesh geometry={plaqueGeo} material={material} castShadow receiveShadow />
      {/* extruded name on the front face */}
      <mesh
        geometry={nameGeo}
        material={nameMaterial}
        position={[0, NAME_Y, NAME_Z]}
        scale={nameScale}
        castShadow
      />
      {/* extruded name on the back face, flipped so it reads as the plaque spins */}
      <mesh
        geometry={nameGeo}
        material={nameMaterial}
        position={[0, NAME_Y, -NAME_Z]}
        rotation={[0, Math.PI, 0]}
        scale={nameScale}
        castShadow
      />
    </group>
  );
}

/**
 * Public component. Wrapped in its own Suspense so the one-time font fetch never
 * blocks the surrounding scene, and memoised so a parent re-render (e.g. a booth
 * selection) doesn't rebuild the sign.
 */
export const RoomSign = memo(function RoomSign(props: RoomSignProps) {
  return (
    <Suspense fallback={null}>
      <RoomSignImpl {...props} />
    </Suspense>
  );
});
