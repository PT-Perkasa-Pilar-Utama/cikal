import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, type RouterHistory, RouterProvider } from "@tanstack/react-router";
import { sessionEndedMessage } from "./features/session/session-end";
import { ApiError } from "./lib/api/client";
import { routeTree } from "./routeTree.gen";

/** Batas percobaan ulang bawaan TanStack Query, hanya untuk error jaringan dan 5xx. */
const MAX_QUERY_RETRIES = 3;

/** Error 4xx adalah jawaban akhir server; mengulang hanya menunda pesan ke pengguna. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

export interface CikalApp {
  router: ReturnType<typeof createAppRouter>;
  queryClient: QueryClient;
}

function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history });
}

/**
 * Router dan query client SPA. Setiap 401 sesi berakhir dari query atau mutation membuang state lokal dan membuka
 * "Login" dengan `message` dari respons (api-specs 02 §2.1; AC-06.02, AC-06.03, AC-06.05).
 */
export function createApp(history?: RouterHistory): CikalApp {
  const router = createAppRouter(history);
  const endSessionOn = (error: Error) => {
    const loginMessage = sessionEndedMessage(error);
    if (loginMessage === undefined) return;
    // Cache dibuang setelah layout aplikasi lepas, agar query yang masih terpasang tidak memuat ulang.
    void router.navigate({ to: "/login", state: { loginMessage }, replace: true }).then(() => queryClient.clear());
  };
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: endSessionOn }),
    mutationCache: new MutationCache({ onError: endSessionOn }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });
  return { router, queryClient };
}

declare module "@tanstack/react-router" {
  interface Register {
    router: CikalApp["router"];
  }
  interface HistoryState {
    /** Pesan sesi berakhir yang tampil di halaman "Login". */
    loginMessage?: string;
    /** Pesan sukses yang dibawa ke halaman tujuan, contoh "Data submitted for approval". */
    notice?: string;
  }
}

export function App({ router, queryClient }: CikalApp) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
