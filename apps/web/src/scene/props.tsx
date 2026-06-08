import { useMemo } from "react";
import { usePbrMaterial } from "../materials/pbr";
import { PlantModel } from "./instancedAssets";

// Shared palette for the "built" furniture so booths feel cohesive.
const CREAM = "#efe7d8";
const WOOD = "#6f4f32";

// The old procedural plant stood ~1 m tall at scale 1; the house_plant GLB is
// fit to this height (in metres) per unit of `scale` so existing placements
// keep their proportions.
const PLANT_BASE_HEIGHT = 1.5;

/** A potted house plant — instanced (see instancedAssets). Auto-fitted and sat
 *  on the floor; never casts the directional shadow (ContactShadows grounds it).
 *  Must be rendered inside <PlantModel.Provider> (Scene.tsx wraps the floor). */
export function Plant({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  return <PlantModel.Placement position={position} fit={{ axis: "y", size: PLANT_BASE_HEIGHT * scale }} />;
}

/** A simple low-poly visitor: capsule body + sphere head, brand-tinted. */
export function Person({
  position = [0, 0, 0],
  rotationY = 0,
  color = "#3a4a63",
  seed = 0,
}: {
  position?: [number, number, number];
  rotationY?: number;
  color?: string;
  seed?: number;
}) {
  // Deterministic slight height variation so a crowd doesn't look cloned.
  const h = 0.74 + ((seed * 37) % 10) / 100;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, h / 2 + 0.06, 0]} castShadow>
        <capsuleGeometry args={[0.16, h, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, h + 0.28, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color="#e8c9a8" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Rounded reception desk with a brand-coloured trim strip. */
export function Desk({
  position = [0, 0, 0],
  rotationY = 0,
  color,
  width = 1.8,
}: {
  position?: [number, number, number];
  rotationY?: number;
  color: string;
  width?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.9, 0.6]} />
        <meshStandardMaterial color={CREAM} roughness={0.6} />
      </mesh>
      {/* top */}
      <mesh position={[0, 0.92, 0.02]} castShadow>
        <boxGeometry args={[width + 0.12, 0.06, 0.7]} />
        <meshStandardMaterial color={WOOD} roughness={0.5} />
      </mesh>
      {/* accent trim */}
      <mesh position={[0, 0.2, 0.31]}>
        <boxGeometry args={[width * 0.92, 0.08, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

/** A wall-mounted LED panel that glows in the brand colour. */
export function WallScreen({
  position = [0, 0, 0],
  rotationY = 0,
  color,
  size = [2.4, 1.4],
}: {
  position?: [number, number, number];
  rotationY?: number;
  color: string;
  size?: [number, number];
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* bezel */}
      <mesh castShadow>
        <boxGeometry args={[size[0] + 0.12, size[1] + 0.12, 0.08]} />
        <meshStandardMaterial color="#15110c" roughness={0.5} />
      </mesh>
      {/* emissive face */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Curved lounge sofa built from an open arc (torus slice). */
export function CurvedSofa({
  position = [0, 0, 0],
  rotationY = 0,
  radius = 1.4,
  arc = Math.PI,
  color = CREAM,
}: {
  position?: [number, number, number];
  rotationY?: number;
  radius?: number;
  arc?: number;
  color?: string;
}) {
  // Carpet/upholstery for seating areas.
  const fabric = usePbrMaterial("carpet", { repeat: [6, 1], color });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* seat ring */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={fabric}>
        <torusGeometry args={[radius, 0.26, 12, 40, arc]} />
      </mesh>
      {/* backrest ring */}
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={fabric}>
        <torusGeometry args={[radius + 0.22, 0.2, 12, 40, arc]} />
      </mesh>
    </group>
  );
}

/** Round coffee/meeting table. */
export function RoundTable({
  position = [0, 0, 0],
  radius = 0.5,
  color = WOOD,
}: {
  position?: [number, number, number];
  radius?: number;
  color?: string;
}) {
  const top = usePbrMaterial("wood", { repeat: [1, 1], color, roughness: 0.5 });
  const leg = usePbrMaterial("metal", { repeat: [1, 1], color: "#2a2a2a", roughness: 0.5, envMapIntensity: 1 });
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow material={top}>
        <cylinderGeometry args={[radius, radius, 0.06, 24]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow material={leg}>
        <cylinderGeometry args={[0.06, 0.06, 0.45, 12]} />
      </mesh>
    </group>
  );
}

/** A slightly-raised booth floor pad (wood) used under each developer room. */
export function FloorPad({
  size,
  color = WOOD,
}: {
  size: [number, number];
  color?: string;
}) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** A scale model of a master-plan: a podium topped with a green base and a
 *  cluster of glassy towers of varying heights — the signature exhibit piece. */
export function TowerModel({
  position = [0, 0, 0],
  accent = "#bcd0e0",
}: {
  position?: [number, number, number];
  accent?: string;
}) {
  // Deterministic tower cluster (no randomness so SSR/resume stays stable).
  const towers: Array<[number, number, number]> = [
    [-0.32, 0.9, -0.2],
    [-0.05, 1.3, 0.05],
    [0.28, 0.7, -0.15],
    [0.12, 1.05, 0.3],
    [-0.25, 0.55, 0.3],
  ];
  return (
    <group position={position}>
      {/* podium */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.9, 1.1]} />
        <meshStandardMaterial color="#6f4f32" roughness={0.5} />
      </mesh>
      {/* accent trim */}
      <mesh position={[0, 0.18, 0.56]}>
        <boxGeometry args={[1.4, 0.06, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
      </mesh>
      {/* landscaped base */}
      <mesh position={[0, 0.93, 0]} receiveShadow>
        <boxGeometry args={[1.35, 0.06, 0.95]} />
        <meshStandardMaterial color="#3f7d4a" roughness={1} />
      </mesh>
      {/* towers */}
      {towers.map((t, i) => (
        <mesh key={i} position={[t[0], 0.96 + t[1] / 2, t[2]]} castShadow>
          <boxGeometry args={[0.18, t[1], 0.18]} />
          <meshStandardMaterial
            color="#e9eef2"
            metalness={0.4}
            roughness={0.25}
            emissive={accent}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      {/* protective glass case */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[1.4, 1.0, 1.0]} />
        <meshStandardMaterial color="#bcd4e6" transparent opacity={0.08} roughness={0} />
      </mesh>
    </group>
  );
}

/** A wooden door panel in a frame, hung slightly ajar. */
export function Door({
  position = [0, 0, 0],
  rotationY = 0,
  width = 1.3,
  height = 2.4,
  open = 0.5,
}: {
  position?: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
  /** 0 = shut, 1 = ~90° open. */
  open?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* frame */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width + 0.18, height + 0.12, 0.16]} />
        <meshStandardMaterial color="#8a6a45" roughness={0.6} />
      </mesh>
      {/* hinged panel (pivot on the left jamb) */}
      <group position={[-width / 2, 0, 0]} rotation={[0, -open * 1.3, 0]}>
        <mesh position={[width / 2, height / 2, 0]} castShadow>
          <boxGeometry args={[width, height - 0.04, 0.06]} />
          <meshStandardMaterial color="#6f4f32" roughness={0.5} />
        </mesh>
        {/* handle */}
        <mesh position={[width - 0.12, height / 2, 0.06]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color="#d9c089" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** A framed project poster / architectural render on a wall. */
export function Poster({
  position = [0, 0, 0],
  rotationY = 0,
  size = [0.8, 1.1],
  accent = "#2f95e0",
}: {
  position?: [number, number, number];
  rotationY?: number;
  size?: [number, number];
  accent?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[size[0] + 0.06, size[1] + 0.06, 0.03]} />
        <meshStandardMaterial color="#15110c" roughness={0.5} />
      </mesh>
      {/* "render": a dim sky gradient with a brand-tinted skyline band */}
      <mesh position={[0, size[1] * 0.18, 0.02]}>
        <planeGeometry args={[size[0], size[1] * 0.6]} />
        <meshStandardMaterial color="#24405e" roughness={0.9} />
      </mesh>
      <mesh position={[0, -size[1] * 0.28, 0.02]}>
        <planeGeometry args={[size[0], size[1] * 0.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/** A single upholstered armchair. */
export function Armchair({
  position = [0, 0, 0],
  rotationY = 0,
  color = "#efe7d8",
}: {
  position?: [number, number, number];
  rotationY?: number;
  color?: string;
}) {
  // Upholstered with the carpet/fabric set (seating area material).
  const fabric = usePbrMaterial("carpet", { repeat: [2, 2], color });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow material={fabric}>
        <boxGeometry args={[0.62, 0.18, 0.6]} />
      </mesh>
      <mesh position={[0, 0.55, -0.26]} castShadow material={fabric}>
        <boxGeometry args={[0.62, 0.55, 0.12]} />
      </mesh>
      <mesh position={[-0.31, 0.42, 0]} castShadow material={fabric}>
        <boxGeometry args={[0.1, 0.32, 0.6]} />
      </mesh>
      <mesh position={[0.31, 0.42, 0]} castShadow material={fabric}>
        <boxGeometry args={[0.1, 0.32, 0.6]} />
      </mesh>
    </group>
  );
}

/** Scatter a few visitors around a point, deterministically. */
export function Crowd({
  around,
  count = 4,
  spread = 1.6,
  color = "#3a4a63",
}: {
  around: [number, number, number];
  count?: number;
  spread?: number;
  color?: string;
}) {
  const people = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + (i % 2 ? 0.6 : 0);
      const r = spread * (0.5 + ((i * 13) % 7) / 14);
      return {
        pos: [around[0] + Math.cos(a) * r, around[1], around[2] + Math.sin(a) * r] as [
          number,
          number,
          number,
        ],
        rot: -a + Math.PI / 2,
        seed: i + 1,
      };
    });
  }, [around, count, spread]);

  return (
    <>
      {people.map((p, i) => (
        <Person key={i} position={p.pos} rotationY={p.rot} color={color} seed={p.seed} />
      ))}
    </>
  );
}
