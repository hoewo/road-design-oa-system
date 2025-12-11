/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AUTH_MODE?: 'gateway' | 'self_validate'
  readonly VITE_NEBULA_AUTH_URL: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_MAX_FILE_SIZE?: string
  readonly VITE_ALLOWED_FILE_TYPES?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
