import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const createConfig = (phase) => {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    experimental: {
      instrumentationHook: true,
    },
    // Cho phép HMR / _next khi mở app qua tunnel (ngrok, v.v.) — xem https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
    allowedDevOrigins: isDevServer
      ? ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io", "*.ngrok.app", "*.loca.lt"]
      : undefined,
    // Không dùng webpack filesystem cache trong dev: trên Windows dễ lỗi "Cannot find module './xxxx.js'" khi chunk lệch.
  };
};

export default createConfig;
