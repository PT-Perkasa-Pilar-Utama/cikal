import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => <h1 className="text-2xl font-bold text-primary">Dashboard</h1>,
});
