/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ENABLE_DEMO_MODE?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_BSC_MAINNET_RPC?: string;
  readonly VITE_BSC_TESTNET_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
