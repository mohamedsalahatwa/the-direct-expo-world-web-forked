import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useTexture, Text } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { CurvedBooth } from "./CurvedBooth";
import { ExhibitionColliders } from "../physics/Colliders";
import { PlayerController } from "../physics/PlayerController";
import {
  EntrancePortal,
  FeaturePlaza,
  VipLounge,
  NetworkingLounge,
  CoffeeCorner,
} from "./Amenities";
import { ReceptionArea, LoungeGroup, GalleryPlants, MainScreen } from "./Furniture";
import { Plant, Crowd } from "./props";
import {
  BOOTHS,
  FLOOR_W,
  FLOOR_D,
  WALL_H,
  BACK_WALL_H,
  FEATURE_PLAZA,
  ENTRANCE_PORTAL,
  VIP_LOUNGE,
  NETWORKING_LOUNGES,
  COFFEE_CORNERS,
  PLANTS,
} from "./layout";
import { PbrProvider, usePbrMaterial } from "../materials/pbr";
import { SceneEnvironment } from "../materials/SceneEnvironment";
import logoUrl from "../assets/images/TDE_header.png";

function Hall() {
  const logo = useTexture(logoUrl);
  // Marble for the main floor; wood for the architectural walls. A subtle warm
  // tint + reduced roughness multiplier reads as polished, reflective marble.
  const marbleFloor = usePbrMaterial("marble", {
    repeat: [10, 11],
    color: "#efe7d8",
    roughness: 0.55,
    envMapIntensity: 0.9,
    normalScale: 0.6,
  });
  const sideWallWood = usePbrMaterial("wood", { repeat: [22, 3], color: "#b8966a" });
  const backWallWood = usePbrMaterial("wood", { repeat: [18, 4], color: "#c2a074" });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow material={marbleFloor}>
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
      </mesh>

      {/* side walls (wood) */}
      <mesh position={[-FLOOR_W / 2, WALL_H / 2, 1]} receiveShadow castShadow material={sideWallWood}>
        <boxGeometry args={[0.5, WALL_H, FLOOR_D]} />
      </mesh>
      <mesh position={[FLOOR_W / 2, WALL_H / 2, 1]} receiveShadow castShadow material={sideWallWood}>
        <boxGeometry args={[0.5, WALL_H, FLOOR_D]} />
      </mesh>

      {/* tall back wall of the hall (wood) */}
      <mesh position={[0, BACK_WALL_H / 2, -FLOOR_D / 2 + 1.5]} receiveShadow castShadow material={backWallWood}>
        <boxGeometry args={[FLOOR_W, BACK_WALL_H, 0.5]} />
      </mesh>
      {/* big branded logo wall: white signage panel + logo + tagline */}
      <group position={[0, 4.0, -FLOOR_D / 2 + 1.78]}>
        <mesh>
          <planeGeometry args={[15, 8]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        {/* gold trim border (sits just behind the white panel) */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[15.5, 8.5]} />
          <meshBasicMaterial color="#c8a24b" toneMapped={false} />
        </mesh>
        {/* logo (transparent PNG over the white panel) */}
        <mesh position={[0, 0.7, 0.04]}>
          <planeGeometry args={[12, 6.2]} />
          <meshBasicMaterial map={logo} transparent toneMapped={false} />
        </mesh>
        <Text
          position={[0, -2.9, 0.05]}
          fontSize={0.72}
          color="#1a2b4a"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.16}
        >
          CONNECT   •   EXPLORE  • INVEST
        </Text>
      </group>
    </group>
  );
}

export type ViewMode = "orbit" | "walk";

export function Scene({
  activeDeveloper,
  onSelectDeveloper,
  mode = "orbit",
}: {
  activeDeveloper: string | null;
  onSelectDeveloper: (id: string) => void;
  /** "orbit" = overview camera; "walk" = first-person physics walkthrough. */
  mode?: ViewMode;
}) {
  const walking = mode === "walk";
  const { camera } = useThree();

  // Restore the cinematic overview pose whenever we leave walk mode (the
  // PlayerController owns the camera while walking).
  useEffect(() => {
    if (!walking) {
      camera.position.set(0, 21, 26);
      camera.lookAt(0, 1, 0);
    }
  }, [walking, camera]);

  return (
    <PbrProvider>
      <color attach="background" args={["#171209"]} />
      <fog attach="fog" args={["#171209", 50, 90]} />

      {/* Studio HDRI → neutral ambient fill + realistic reflections. It carries
          most of the soft ambient, so the explicit fill lights below stay low.
          Sky stays hidden so the gallery reads as an indoor space. */}
      {/* TEMPORARILY DISABLED — checking something. Re-enable when done. */}
      {/* <SceneEnvironment intensity={0.85} /> */}

      {/* Gentle ambient/sky fill — kept low since the HDRI provides most of it. */}
      <ambientLight intensity={0.18} />
      <hemisphereLight args={["#fff6ec", "#34291c", 0.28]} />

      {/* Soft, near-white key light for gallery-style modelling + crisp shadows.
          A larger map + blur radius gives soft, realistic contact shadows. */}
      <directionalLight
        position={[12, 24, 16]}
        intensity={1.6}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.035}
        shadow-radius={5}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />

      {/* Warm gallery accent pools (track-lighting feel) — soft, not dominant. */}
      <pointLight position={[-12, 9, -4]} intensity={22} color="#ffe3b8" distance={42} decay={2} />
      <pointLight position={[12, 9, -2]} intensity={22} color="#ffe3b8" distance={42} decay={2} />
      <pointLight position={[0, 9, 14]} intensity={18} color="#fff0d8" distance={42} decay={2} />

      <Hall />

      {/* Physics world: static colliders mirror the visuals; the player is the
          only dynamic actor. Stepping is paused in overview mode to save CPU. */}
      <Physics paused={!walking} gravity={[0, -9.81, 0]} timeStep="vary">
        <ExhibitionColliders />
        <PlayerController enabled={walking} />
      </Physics>

      {/* 30 developer booths on a spaced grid; two blocks face the avenue */}
      {BOOTHS.map(({ dev, position, rotationY }) => (
        <group key={dev.id} position={position} rotation={[0, rotationY, 0]}>
          <CurvedBooth
            dev={dev}
            active={activeDeveloper === dev.id}
            onSelect={onSelectDeveloper}
          />
        </group>
      ))}

      {/* central hero attraction (centre of the avenue) */}
      <FeaturePlaza position={FEATURE_PLAZA.position} />

      {/* branded entrance + front reception amenities */}
      <EntrancePortal position={ENTRANCE_PORTAL.position} />
      <VipLounge position={VIP_LOUNGE.position} rotationY={VIP_LOUNGE.rotationY} />

      {/* GLB furniture: reception near the entrance, waiting lounges flanking it,
          plants around reception + corners, and the hero video wall. */}
      <ReceptionArea />
      <LoungeGroup position={[-17, 0, 19]} rotationY={0} />
      <LoungeGroup position={[17, 0, 19]} rotationY={0} />
      <GalleryPlants />
      <MainScreen />

      {/* lounges down the central avenue + coffee corners in the aisle gaps */}
      {NETWORKING_LOUNGES.map((l, i) => (
        <NetworkingLounge key={`net${i}`} position={l.position} rotationY={l.rotationY} />
      ))}
      {COFFEE_CORNERS.map((c, i) => (
        <CoffeeCorner key={`cof${i}`} position={c.position} />
      ))}

      {/* landscaping at clear aisle cross-points */}
      {PLANTS.map((p, i) => (
        <Plant key={`plant${i}`} position={p.position} scale={1.3} />
      ))}

      {/* visitors along the open avenue + front concourse (clear of booths) */}
      <Crowd around={[0, 0, 6]} count={5} spread={2.6} color="#46506b" />
      <Crowd around={[0, 0, -12]} count={4} spread={2.6} color="#5a4636" />
      <Crowd around={[0, 0, 19]} count={4} spread={2.8} color="#3f4a5e" />
      <Crowd around={[3, 0, 20]} count={3} spread={1.8} color="#534434" />

      <ContactShadows position={[0, 0.02, 1]} opacity={0.4} scale={56} blur={2.6} far={10} resolution={512} />

      {/* Overview camera — disabled while walking so it doesn't fight the
          first-person PointerLock camera. */}
      {!walking && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          target={[0, 1, 0]}
          minPolarAngle={Math.PI / 9}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={16}
          maxDistance={66}
        />
      )}
    </PbrProvider>
  );
}
