"use client";
import dynamic from "next/dynamic";

// Render this library purely on the client to avoid any SSR/CSR hydration drift
const GuidelinesLibrary = dynamic(() => import("@/components/GuidelinesLibrary"), {
  ssr: false,
  // Minimal placeholder while loading on the client
  loading: () => (
    <div className="min-h-screen bg-neutral-950 text-neutral-100" />
  ),
});

export default function Page() {
  return <GuidelinesLibrary />;
}
