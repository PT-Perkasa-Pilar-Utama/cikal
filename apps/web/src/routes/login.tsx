import { createFileRoute } from "@tanstack/react-router";

/** Halaman "Login" dibangun di kartu FE-S1-01 (api-specs 02). */
export const Route = createFileRoute("/login")({
  component: () => (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold text-primary">Login</h1>
    </main>
  ),
});
