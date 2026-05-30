/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for running on the VPS as a systemd service
  // (node .next/standalone/server.js) behind the Cloudflare tunnel.
  output: 'standalone',
}
module.exports = nextConfig
