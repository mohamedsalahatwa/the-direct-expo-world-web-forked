import { Suspense } from "react";
import { useTexture } from "@react-three/drei";
import { GlbModel, GLB } from "./GlbModel";
import { PlantModel } from "./instancedAssets";
import logoUrl from "../assets/images/TDE_header.png";

/**
 * Real-world GLB furniture placed across the gallery. Every group is wrapped in
 * its own <Suspense fallback={null}> so a heavy asset never blocks the rest of
 * the scene from rendering — pieces pop in as they finish loading.
 *
 * Positions are pre-verified collision-free against the booths and amenities;
 * see the layout notes in Scene.tsx.
 */

/* ----------------------------- Reception ------------------------------- */

/** Furnished reception vignette near the entrance (front-left lobby). */
export function ReceptionArea() {
  return (
    <Suspense fallback={null}>
      {/* faces +Z toward the incoming visitor */}
      <GlbModel url={GLB.receptionDesk} position={[-9, 0, 16]} rotationY={0} fit={{ axis: "max", size: 4.2 }} />
    </Suspense>
  );
}

/* --------------------------- Lounge group ------------------------------ */

/**
 * A comfortable waiting/lounge cluster: a sofa, two chairs and a centred coffee
 * table, with a plant accent. Built around a local origin and dropped at
 * `position` with an overall `rotationY`.
 */
export function LoungeGroup({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Suspense fallback={null}>
        {/* coffee table centred between the seating */}
        <GlbModel url={GLB.coffeeTable} position={[0, 0, 0]} fit={{ axis: "max", size: 1.5 }} />
        {/* sofa behind the table, facing it (+Z) */}
        <GlbModel url={GLB.sofa} position={[0, 0, -1.7]} rotationY={Math.PI / 2} fit={{ axis: "max", size: 2.2 }} />
        {/* two chairs flanking, angled toward the table */}
        <GlbModel url={GLB.chair} position={[-1.7, 0, 0.6]} rotationY={Math.PI / 2.4} fit={{ axis: "y", size: 1.4 }} />
        <GlbModel url={GLB.chair} position={[1.7, 0, 0.6]} rotationY={-Math.PI / 2.4} fit={{ axis: "y", size: 1.4 }} />
        {/* plant accent at the back corner (instanced) */}
        <PlantModel.Placement position={[1.9, 0, -1.5]} fit={{ axis: "y", size: 1.7 }} />
      </Suspense>
    </group>
  );
}

/* ----------------------------- Plants ---------------------------------- */

/** Decorative GLB plants around reception and at the gallery corners. */
export function GalleryPlants() {
  const spots: { pos: [number, number, number]; size: number }[] = [
    { pos: [-12, 0, 18.5], size: 1.7 }, // reception flank
    { pos: [-6, 0, 18.5], size: 1.6 }, // reception flank
    { pos: [-22, 0, 14], size: 1.9 }, // front-left corner
    { pos: [22, 0, 14], size: 1.9 }, // front-right corner
    { pos: [0, 0, -22], size: 2.0 }, // far avenue end
  ];
  return (
    <>
      {spots.map((s, i) => (
        <PlantModel.Placement key={i} position={s.pos} fit={{ axis: "y", size: s.size }} />
      ))}
    </>
  );
}

/* ---------------------------- Main screen ------------------------------ */

/**
 * The hero video wall: a large TV in the central avenue (behind the plaza),
 * facing the entrance so it greets visitors. A bright emissive panel over the
 * screen plays the brand "promo" content.
 */
export function MainScreen() {
  const logo = useTexture(logoUrl);
  return (
    <group position={[0, 0, -7]} rotation={[0, 0, 0]}>
      <Suspense fallback={null}>
        {/* large 77" OLED scaled up into a ~4.4 m video wall, facing +Z */}
        <GlbModel url={GLB.tvMain} position={[0, 0, 0]} rotationY={0} fit={{ axis: "x", size: 4.4 }} />
      </Suspense>
      {/* promotional content on the screen face (emissive so it "plays") */}
      <group position={[0, 1.7, 0.16]}>
        <mesh>
          <planeGeometry args={[4.0, 2.25]} />
          <meshStandardMaterial color="#0b1a2c" emissive="#13314f" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[3.2, 1.65]} />
          <meshBasicMaterial map={logo} transparent toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
