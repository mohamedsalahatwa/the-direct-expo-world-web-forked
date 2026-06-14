import { memo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { DoubleSide, type Group } from "three";
import type { Developer } from "./developers";
import { Plant, Armchair, RoundTable } from "./props";
import { usePbrMaterial } from "../materials/pbr";
import { RoomSign } from "./RoomSign";

const CREAM = "#efe7d8";
const R = 1.95; // curved-wall radius
const H = 2.6; // wall height
const GAP = 1.35; // front opening angle (radians), centred on +Z

/**
 * One curved, contemporary developer booth opening toward the visitor (+Z):
 * a cream C-wall, a wall-mounted property render, a low reception desk carrying
 * the developer name, a small lounge (table + chairs) and flanking greenery.
 */
function CurvedBoothImpl({
  dev,
  boothNumber,
  active,
  onSelect,
}: {
  dev: Developer;
  boothNumber: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const boothLabel = String(boothNumber);
  const liftRef = useRef<Group>(null);
  const numberRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const highlight = active || hovered;

  // Shared PBR materials — identical across all 30 booths, so they're built
  // once and reused (one wood/carpet/metal instance for the whole floor).
  // Booth room wall uses oriented strand board (OSB).
  const wallOsb = usePbrMaterial("osb", { repeat: [6, 2], color: CREAM, side: DoubleSide });
  const padCarpet = usePbrMaterial("carpet", { repeat: [2, 2], color: "#cdbfa6" });
  const deskWood = usePbrMaterial("wood", { repeat: [2, 1], color: CREAM });
  const deskTopWood = usePbrMaterial("wood", { repeat: [2, 1], color: "#7a5836", roughness: 0.55 });

  useFrame((state) => {
    // Floating booth number: bob up/down + spin a full 360° about Y.
    const n = numberRef.current;
    if (n) {
      const now = state.clock.elapsedTime;
      n.position.y = 1.45 + Math.sin(now * 0.9) * 0.14;
      n.rotation.y = now * 0.6;
    }

    const g = liftRef.current;
    if (!g) return;
    const t = active ? 0.14 : hovered ? 0.06 : 0;
    const dy = t - g.position.y;
    // Settled: skip the lift write so 30 idle booths cost ~nothing per frame.
    if (Math.abs(dy) < 0.0005) return;
    g.position.y += dy * 0.15;
  });

  return (
    <group>
      {/* premium floating gold showroom sign above the room (grouped with the
          booth so it travels if the booth moves; sits clear above the 2.6 m wall) */}
      <RoomSign text={dev.name} glow={dev.color} height={3.35} size={0.42} />

      {/* selection ring on the floor at the booth opening */}
      <mesh position={[0, 0.04, 1.6]} rotation={[-Math.PI / 2, 0, 0]} visible={highlight}>
        <ringGeometry args={[2.15, 2.4, 48]} />
        <meshStandardMaterial color={dev.color} emissive={dev.color} emissiveIntensity={active ? 1 : 0.5} toneMapped={false} />
      </mesh>

      {/* floating booth number at the centre of the room: bobs up/down + spins
          360°. Double-sided (front + back) so it reads from every angle. */}
      <group ref={numberRef} position={[0, 1.45, 0]}>
        <Text
          fontSize={0.5}
          color={dev.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
          raycast={() => null}
        >
          {boothLabel}
        </Text>
        {/* <Text
          rotation={[0, Math.PI, 0]}
          fontSize={0.5}
          color={dev.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
          raycast={() => null}
        >
          {boothLabel}
        </Text> */}
      </group>

      <group
        ref={liftRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(dev.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        {/* booth floor pad (carpet) */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={padCarpet}>
          <circleGeometry args={[2.25, 40]} />
        </mesh>

        {/* curved C-wall, open toward +Z (oriented strand board, double-sided) */}
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={wallOsb}>
          <cylinderGeometry args={[R, R, H, 48, 1, true, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP]} />
        </mesh>

        {/* low reception desk at the opening, carrying the developer name (wood) */}
        <mesh position={[0, 0.45, 1.35]} castShadow receiveShadow material={deskWood}>
          <boxGeometry args={[2.2, 0.9, 0.5]} />
        </mesh>
        <mesh position={[0, 0.92, 1.35]} castShadow material={deskTopWood}>
          <boxGeometry args={[2.3, 0.06, 0.6]} />
        </mesh>
        <mesh position={[0, 0.2, 1.61]}>
          <boxGeometry args={[2.0, 0.1, 0.02]} />
          <meshStandardMaterial color={dev.color} emissive={dev.color} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0.55, 1.62]}
          fontSize={0.26}
          color={dev.color}
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
          outlineWidth={0.006}
          outlineColor="#000"
          // Skip the glyph mesh during pointer raycasts (it's inside the booth's
          // interactive group); troika text raycasting is disproportionately costly.
          raycast={() => null}
        >
          {dev.name}
        </Text>

        {/* lounge: table + two chairs inside the pod */}
        <RoundTable position={[0.55, 0, 0.35]} radius={0.36} />
        <Armchair position={[1.15, 0, 0.5]} rotationY={-Math.PI / 1.7} color="#e7ddcb" />
        <Armchair position={[0.0, 0, 0.55]} rotationY={Math.PI / 1.7} color="#e7ddcb" />

        {/* greenery at the front tips of the curved wall */}
        <Plant position={[-1.2, 0, 1.5]} scale={0.95} />
        <Plant position={[1.25, 0, 1.5]} scale={0.95} />
      </group>
    </group>
  );
}

// Memoised: with a stable `onSelect` (see App's useCallback) and stable `dev`,
// only the booth whose `active` flips re-renders on selection — not all 30.
export const CurvedBooth = memo(CurvedBoothImpl);
