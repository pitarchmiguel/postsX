import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Cargar .env explícitamente (Next.js 16 / Turbopack puede no cargarlo en algunos contextos)
config({ path: path.resolve(process.cwd(), ".env") });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
