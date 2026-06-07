/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the Azure Blob + CDN container that hosts the GLB models
   * (e.g. https://<account>.blob.core.windows.net/models). Unset → the bundled
   * copies in /public/models are used. Must be VITE_-prefixed to be exposed to
   * client code. See apps/web/.env.example.
   */
  readonly VITE_MODELS_BASE_URL?: string;

  /**
   * Base URL of the container hosting the HDRI/.exr environment maps
   * (e.g. https://<account>.blob.core.windows.net/hdri). Unset → /public/hdri.
   */
  readonly VITE_HDRI_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
