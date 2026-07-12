/** @type {import('next').NextConfig} */
const nextConfig = {
  // DEMO: no bloquear el build por lint mientras los especialistas iteran.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
