import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { LoginForm } from "../features/session/LoginForm";

/** Halaman "Login": kartu putih di atas Primary dengan aksen organik di sudut (design-system 8.1, api-specs 02 §2.2). */
function LoginPage() {
  const notice = useRouterState({ select: (state) => state.location.state.loginMessage });
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-pink/40 blur-3xl" />
        <div className="absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-orange/40 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 size-72 rounded-full bg-primary-light/20 blur-3xl" />
      </div>
      <section className="relative w-full max-w-md rounded-2xl bg-neutral-0 p-8 shadow-xl">
        <div className="mb-6 inline-flex rounded-lg bg-primary px-3 py-1.5 text-lg font-bold tracking-wide text-neutral-0">
          Cikal
        </div>
        <h1 className="text-2xl leading-tight font-bold text-primary">Welcome</h1>
        <p className="mt-1 mb-6 text-neutral-5">Loan Origination System</p>
        <LoginForm notice={notice} />
        <p className="mt-6 text-center text-xs text-neutral-5">
          Don't have an account? Please contact your administrator
        </p>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
