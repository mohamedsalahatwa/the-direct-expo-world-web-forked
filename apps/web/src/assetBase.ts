// Single source of truth for where the 3D assets live — the GLB furniture/props
// AND the Poly Haven .gltf texture sets, which all sit under one container.
//
// Set VITE_MODELS_BASE_URL to your Azure Blob + CDN container
// (e.g. https://<account>.blob.core.windows.net/models) to serve everything from
// the CDN; leave it unset and the bundled copies in /public/models are used (the
// local-dev default). A trailing slash is optional — we strip it.
//
// NB: the var MUST be VITE_-prefixed — Vite only exposes VITE_* keys to client
// code, so a bare MODELS_URL would always read back undefined. The CDN container
// must also send CORS headers allowing GET from the site origin (three's loaders
// fetch with crossOrigin="anonymous"). See apps/web/.env.example.
export const MODELS_BASE_URL = (import.meta.env.VITE_MODELS_BASE_URL ?? "/models").replace(/\/+$/, "");

// Same idea for the HDRI/.exr environment maps, which live under /public/hdri
// (a separate folder, so a separate var). Set VITE_HDRI_BASE_URL to its CDN
// container; unset → /public/hdri.
export const HDRI_BASE_URL = (import.meta.env.VITE_HDRI_BASE_URL ?? "/hdri").replace(/\/+$/, "");
