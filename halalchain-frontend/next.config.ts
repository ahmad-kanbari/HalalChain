import type { NextConfig } from "next";


/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}, // Enable Turbopack, ignore custom Webpack
};

module.exports = nextConfig;


// const nextConfig: NextConfig = {
//   webpack: (config) => {
//     config.externals.push('pino-pretty', 'lokijs', 'encoding');
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       fs: false,
//       net: false,
//       tls: false,
//     };
//     return config;
//   },
  
// };

export default nextConfig;
