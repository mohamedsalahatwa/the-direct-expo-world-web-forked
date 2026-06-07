import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  EquirectangularReflectionMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderTarget,
} from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { MODELS_BASE_URL } from "../assetBase";

/**
 * Loads an HDRI/EXR sky, converts it with PMREMGenerator and uses it as the
 * scene's image-based lighting (`scene.environment`) for realistic PBR
 * reflections and soft ambient fill.
 *
 * The exhibition stays an INDOOR gallery: the outdoor sky is used only for
 * reflections/ambient (low `environmentIntensity`) and is NOT shown as the
 * background by default, so it never dominates. The dark indoor backdrop and
 * the artificial light fixtures defined in Scene.tsx remain the primary look.
 *
 * Also applies the "realistic rendering" pipeline settings: ACES Filmic tone
 * mapping, sRGB output, and soft (PCF) shadow maps. Three.js r152+ is
 * physically-based by default (no `useLegacyLights`), so lights already use
 * physical falloff.
 *
 * Memory: the source EXR DataTexture and the PMREM generator are temporary —
 * both are disposed immediately after the env map is produced; only the small
 * pre-filtered cube-UV target is kept (and disposed on unmount).
 */
export function SceneEnvironment({
  /** HDRI strength as IBL. A neutral studio HDRI can drive more of the look. */
  intensity = 0.85,
  /** Tone-mapping exposure. */
  exposure = 1.0,
  /** Path to the equirectangular .exr (remote CDN when configured, else /public/hdri). */
  url = `${MODELS_BASE_URL}/grasslands_sunset_4k.exr`,
  /** Show the sky as the background too? Off by default (stay indoor). */
  showBackground = false,
}: {
  intensity?: number;
  exposure?: number;
  url?: string;
  showBackground?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  // Realistic rendering settings (applied once, independent of HDRI load).
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.outputColorSpace = SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, [gl, exposure]);

  // Load + convert the EXR into an environment map.
  useEffect(() => {
    let cancelled = false;
    let envMap: Texture | null = null;
    const prevBackground = scene.background;

    new EXRLoader().load(url, (exr) => {
      if (cancelled) {
        exr.dispose();
        return;
      }
      exr.mapping = EquirectangularReflectionMapping;

      const pmrem = new PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      const target: WebGLRenderTarget = pmrem.fromEquirectangular(exr);
      envMap = target.texture;

      scene.environment = envMap;
      scene.environmentIntensity = intensity;

      if (showBackground) {
        scene.background = envMap;
        scene.backgroundIntensity = intensity;
        scene.backgroundBlurriness = 0.4; // soften so it reads as ambient, not a sharp sky
      }

      // Free the temporaries: the raw EXR (~tens of MB) and the generator's
      // working render targets are no longer needed once the env map exists.
      exr.dispose();
      pmrem.dispose();
    });

    return () => {
      cancelled = true;
      if (scene.environment === envMap) scene.environment = null;
      if (scene.background === envMap) scene.background = prevBackground;
      envMap?.dispose();
    };
  }, [gl, scene, url, intensity, showBackground]);

  return null;
}
