import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { ThemeProvider } from "./hooks/use-theme.tsx";
import { isApiError } from "./lib/api-client.ts";
import { AccountsPage } from "./routes/accounts-page.tsx";
import { BackupsPage } from "./routes/backups-page.tsx";
import { HomeRedirect } from "./routes/home-redirect.tsx";
import { NotFoundPage } from "./routes/not-found-page.tsx";
import { SettingsPage } from "./routes/settings-page.tsx";
import { WelcomePage } from "./routes/welcome-page.tsx";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry once for server errors or an unreachable server, never for 4xx answers.
        retry: (failureCount, error) =>
          failureCount < 1 && !(isApiError(error) && error.status >= 400 && error.status < 500),
        staleTime: 5_000,
      },
    },
  });
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell showNav={false} />}>
        <Route path="welcome" element={<WelcomePage />} />
      </Route>
      <Route element={<AppShell />}>
        <Route index element={<HomeRedirect />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

type AppProvidersProps = {
  queryClient: QueryClient;
  children: ReactNode;
};

/** Theme, server state and toasts. The router is supplied by the caller (tests use MemoryRouter). */
export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <AppProviders queryClient={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
