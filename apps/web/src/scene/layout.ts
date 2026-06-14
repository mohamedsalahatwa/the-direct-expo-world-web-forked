import { DEVELOPERS } from "./developers";

/**
 * Single source of truth for the exhibition floor plan.
 *
 * Both the visual scene (Scene.tsx) and the physics colliders
 * (physics/*) read these values so visuals and collision geometry can
 * never drift apart. Change a dimension here and both update together.
 */

// ----- Hall shell dimensions -----
export const FLOOR_W = 50; // x extent of the marble floor
export const FLOOR_D = 54; // z extent of the marble floor
export const FLOOR_CENTER_Z = 1; // floor plane is offset +1 on z (see Scene)
export const WALL_H = 6; // side-wall height
export const BACK_WALL_H = 10; // taller branded back wall
export const WALL_THICKNESS = 0.5; // matches the wall box geometry

// ----- Booth geometry (mirrors CurvedBooth.tsx) -----
export const BOOTH_R = 1.95; // curved C-wall radius
export const BOOTH_H = 2.6; // C-wall height
export const BOOTH_GAP = 1.35; // front opening angle (radians), centred on +Z
export const BOOTH_DESK_W = 2.2; // reception desk width
export const BOOTH_DESK_D = 0.5; // reception desk depth
export const BOOTH_DESK_Z = 1.35; // reception desk forward offset

// ----- Spaced grid layout: two booth blocks flanking a central avenue -----
// Booths sit on a regular 3-column × 5-row grid on each side of an open
// central avenue (which carries the hero plaza + entrance). Every booth is at
// least BOOTH_PITCH apart — comfortably more than a booth's ~2.5 m footprint —
// so no walls or props ever touch or intersect. All booths share the right
// block's orientation (openings face −X), so every booth is identical.
export const BOOTH_FOOTPRINT = 2.5; // keep-out radius of one booth (wall + pad + front props)
const BOOTH_PITCH = 7; // centre-to-centre spacing (≈2 m clear between booths)
const COLS_LEFT = [-7.5, -14.5, -21.5];
const COLS_RIGHT = [7.5, 14.5, 21.5];
const ROWS = [-20, -13, -6, 1, 8];

export type BoothPlacement = {
  dev: (typeof DEVELOPERS)[number];
  position: [number, number, number];
  rotationY: number;
};

/** Deterministic, collision-free placement of all 30 booths. */
export const BOOTHS: BoothPlacement[] = (() => {
  const out: BoothPlacement[] = [];
  let i = 0;
  const block = (cols: number[], rotationY: number) => {
    for (const x of cols) {
      for (const z of ROWS) {
        out.push({ dev: DEVELOPERS[i++], position: [x, 0, z], rotationY });
      }
    }
  };
  // Both blocks use the same rotation as the right block, so all 30 booths are
  // oriented identically (no mirroring between sides).
  block(COLS_LEFT, -Math.PI / 2);
  block(COLS_RIGHT, -Math.PI / 2);
  return out;
})();

// Re-exported for any callers that referenced the grid metrics.
export { BOOTH_PITCH };

/** Static furniture / amenity placements that also need collision. Kept here
 *  so the collider layer stays a pure data-driven mirror of Scene.tsx. */
export type AmenityPlacement = {
  position: [number, number, number];
  rotationY?: number;
};

// All amenity positions below are verified to clear every booth and each other
// (central avenue + front reception zone + aisle gaps between booth columns).
export const FEATURE_PLAZA: AmenityPlacement = { position: [0, 0, 0] };
export const INFORMATION_DESK: AmenityPlacement = { position: [-9, 0, 16], rotationY: 0.12 };
export const VIP_LOUNGE: AmenityPlacement = { position: [9, 0, 16], rotationY: -Math.PI / 8 };
export const ENTRANCE_PORTAL: AmenityPlacement = { position: [0, 0, 23] };

// Networking lounges run down the open central avenue (in front of, and behind,
// the hero plaza).
export const NETWORKING_LOUNGES: AmenityPlacement[] = [
  { position: [0, 0, 12], rotationY: Math.PI },
  { position: [0, 0, -18], rotationY: 0 },
  // (the spot behind the plaza at z≈-8 is reserved for the main video wall)
];

// Coffee corners tuck into the aisle gaps between booth columns.
export const COFFEE_CORNERS: AmenityPlacement[] = [
  { position: [-11, 0, -2.5] },
  { position: [11, 0, -9.5] },
];

// Decorative plants at clear aisle cross-points.
export const PLANTS: AmenityPlacement[] = [
  { position: [-11, 0, 4.5] },
  { position: [11, 0, 4.5] },
  { position: [-11, 0, -16.5] },
  { position: [11, 0, -16.5] },
];
