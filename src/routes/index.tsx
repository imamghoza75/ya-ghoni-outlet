import { createFileRoute } from "@tanstack/react-router";
import { KasirApp } from "@/components/kasir/kasir-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <KasirApp />;
}
