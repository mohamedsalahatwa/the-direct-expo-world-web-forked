import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, Text3D } from "@react-three/drei";
import { Color, MathUtils, MeshStandardMaterial, type Group } from "three";

/**
 * Premium floating "showroom sign": extruded, beveled 3D text mounted above a
 * room, finished as an illuminated metallic-gold logo.
 *
 *  - Real depth + bevel via drei <Text3D> (extruded TextGeometry), Optimer serif
 *    for a luxury real-estate feel.
 *  - Metallic gold MeshStandardMaterial (metalness 1) that picks up the scene
 *    HDRI for genuine reflections, plus a warm emissive so it reads as "lit"
 *    without needing postprocessing/bloom.
 *  - Animated entirely in useFrame via refs (no React state → no re-renders):
 *      • slow vertical float,
 *      • gentle Y *sway* (oscillation, not a full spin — so it never turns its
 *        back to the camera and stays readable from any angle),
 *      • a smooth fade-in (opacity + emissive + slight rise & scale settle) the
 *        first ~1.4 s after it mounts, so signs glow into place as the scene loads.
 *
 * Drop it inside a room's group so it inherits the room's position/rotation and
 * travels with it. The font is served locally from /public/fonts (no CDN).
 *
 * Want a full continuous rotation instead of the sway? Replace the `rotation.y`
 * line in useFrame with `g.rotation.y = t * 0.4;` (readability tradeoff noted).
 */

const FONT_URL = "/fonts/optimer_regular.typeface.json";

const GOLD = "#d9b45a"; // warm polished gold
const GOLD_GLOW = "#6e4e16"; // default emissive (overridden by `glow`)

const FADE_SECONDS = 1.4;
const FLOAT_AMP = 0.06; // metres
const FLOAT_SPEED = 0.8; // rad/s
const SWAY_AMP = 0.22; // rad (~12.6°)
const SWAY_SPEED = 0.45; // rad/s
const PEAK_EMISSIVE = 0.5;

export interface RoomSignProps {
  /** The room/developer name to display. */
  text: string;
  /** Sign height above the room floor, in metres (clear of the walls). */
  height?: number;
  /** Letter cap height in metres — scale this to the room size. */
  size?: number;
  /** Z offset toward the room opening so the sign reads from the front. */
  z?: number;
  /** Accent tint mixed into the glow (defaults to warm gold). */
  glow?: string;
}

function RoomSignImpl({ text, height = 3.35, size = 0.42, z = 0.35, glow }: RoomSignProps) {
  const group = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);

  // One gold material per sign (cheap; lets each fade from its own mount time as
  // booths stream in). Memoised so it survives re-renders without rebuilding.
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(GOLD),
        metalness: 1,
        roughness: 0.26,
        emissive: new Color(glow ?? GOLD_GLOW),
        emissiveIntensity: 0, // ramped in during fade-in
        envMapIntensity: 1.5, // reflect the scene HDRI
        transparent: true,
        opacity: 0,
      }),
    [glow],
  );
  useEffect(() => () => material.dispose(), [material]);

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
    g.scale.setScalar(0.92 + 0.08 * ease);

    // Continuous, elegant idle motion.
    g.position.y = height + Math.sin(now * FLOAT_SPEED) * FLOAT_AMP - (1 - ease) * 0.15;
    g.rotation.y = Math.sin(now * SWAY_SPEED) * SWAY_AMP;
  });

  return (
    <group ref={group} position={[0, height, z]}>
      {/* Center the extruded geometry on the group origin so it floats/sways
          about its own centre rather than its baseline-left start point. */}
      <Center>
        <Text3D
          font={FONT_URL}
          size={size}
          height={size * 0.32} // extrusion depth
          bevelEnabled
          bevelThickness={size * 0.05}
          bevelSize={size * 0.03}
          bevelSegments={4}
          curveSegments={6}
          letterSpacing={size * 0.04}
          material={material}
        >
          {text}
        </Text3D>
      </Center>
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
