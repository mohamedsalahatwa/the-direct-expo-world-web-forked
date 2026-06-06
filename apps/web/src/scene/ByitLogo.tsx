import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Shape, type Group } from "three";
import { BRAND } from "./brand3d";

// Plaque silhouette (matches the reference: a banner slab with a slanted top —
// tall right edge, shorter left edge).
const HALF_W = 1.6;
const H_RIGHT = 2.2;
const H_LEFT = 1.55;
const DEPTH = 0.55;
// Vertical centre of the slab so the group origin sits at its visual middle
// (keeps the spin pivot and tilt balanced).
const MID_Y = (H_RIGHT + H_LEFT) / 4;

// Intentional architectural lean: tip forward toward the viewer (X) and lean to
// the side (Z). Applied in the spinning frame so the lean sweeps as it rotates.
const TILT_X = -0.13; // forward
const TILT_Z = 0.16; // sideways

// Animation: a full turn every 18 s + a subtle vertical float.
const TURN_SECONDS = 18;
const SPIN = (Math.PI * 2) / TURN_SECONDS; // rad/s
const FLOAT_AMP = 0.05; // subtle — keeps the pedestal looking mounted
const FLOAT_SPEED = 0.9;

// How high the tilted plaque is mounted above its base (on top of the pedestal).
const MOUNT_Y = 1.9;

/** Slanted-top "banner" outline, centred on the origin. */
function bannerShape(): Shape {
  const s = new Shape();
  s.moveTo(-HALF_W, -MID_Y);
  s.lineTo(HALF_W, -MID_Y);
  s.lineTo(HALF_W, H_RIGHT - MID_Y);
  s.lineTo(-HALF_W, H_LEFT - MID_Y);
  s.closePath();
  return s;
}

/**
 * The hero "Byit" monument: an extruded orange banner plaque with raised 3D
 * "Byit" lettering, tilted forward/sideways like an exhibition sculpture and
 * mounted on an angled pedestal. Spins slowly about the world Y-axis (pivot at
 * the pedestal centre) and floats gently. Sits at the centre of the plaza.
 */
export function ByitLogo({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const ref = useRef<Group>(null);
  const baseY = position[1];

  // Orange plaque: extrude the banner with a soft bevel, centred on Z.
  const plaqueGeo = useMemo(() => {
    const geo = new ExtrudeGeometry(bannerShape(), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 4,
    });
    geo.translate(0, 0, -DEPTH / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += SPIN * delta; // slow, smooth, frame-rate independent
    g.position.y = baseY + Math.sin(state.clock.elapsedTime * FLOAT_SPEED) * FLOAT_AMP;
  });

  return (
    <group ref={ref} position={position}>
      {/* --- angled pedestal: drum plinth + a braced neck up to the plaque --- */}
      {/* polished drum plinth */}
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.2, 0.52, 48]} />
        <meshStandardMaterial color={BRAND.DARK} roughness={0.3} metalness={0.55} envMapIntensity={1.2} />
      </mesh>
      {/* thin gold accent ring on the plinth */}
      <mesh position={[0, 0.53, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.06, 0.03, 12, 48]} />
        <meshStandardMaterial color={BRAND.ORANGE} emissive={BRAND.ORANGE} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>

      {/* tilted assembly: plaque + lettering + angled support neck. Tilt lives
          inside the spinning group, so the lean sweeps and the Y pivot stays
          centred on the pedestal. */}
      <group rotation={[TILT_X, 0, TILT_Z]} position={[0, MOUNT_Y, 0]}>
        {/* angled support neck connecting the plaque base down into the drum */}
        <mesh position={[0, -MID_Y - 0.45, -0.05]} castShadow>
          <boxGeometry args={[1.5, 1.1, 0.5]} />
          <meshStandardMaterial color={BRAND.DARK} roughness={0.32} metalness={0.5} envMapIntensity={1.1} />
        </mesh>

        {/* orange extruded plaque */}
        <mesh geometry={plaqueGeo} castShadow receiveShadow>
          <meshStandardMaterial color={BRAND.ORANGE} roughness={0.42} metalness={0.08} envMapIntensity={1.0} />
        </mesh>
      </group>
    </group>
  );
}
