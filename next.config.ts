import type { NextConfig } from "next";

// Security headers applied to every response.
const securityHeaders = [
  // Disallow being embedded in a frame (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Don't let the browser MIME-sniff responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer leakage.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years, including subdomains.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
