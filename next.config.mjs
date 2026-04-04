import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const createConfig = (phase) => {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Keep dev/build artifacts separated to avoid .next collisions.
    distDir: isDevServer ? ".next-dev" : ".next",
    experimental: {
      instrumentationHook: true,
    },
    // Cho phép HMR / _next khi mở app qua tunnel (ngrok, v.v.) — xem https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
    allowedDevOrigins: isDevServer
      ? ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app", "*.loca.lt"]
      : undefined,
    webpack: (config, { dev, dir }) => {
      if (dev) {
        // Persistent cache = faster restarts than memory-only; wipe with `npm run dev:clean` if corrupted.
        config.cache = {
          type: "filesystem",
          buildDependencies: { config: [fileURLToPath(import.meta.url)] },
          cacheDirectory: `${dir}/.webpack-cache`,
          compression: "gzip",
        };
      }
      return config;
    },
  };
};

export default createConfig;
