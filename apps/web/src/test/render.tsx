import { QueryClient } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { AppProviders, AppRoutes } from "../app.tsx";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

type RenderOptions = { route?: string; queryClient?: QueryClient };

/** Render any element inside the app's providers and a memory router. */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", queryClient = createTestQueryClient() }: RenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const result = render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { ...result, queryClient };
}

/** Render the whole app at a route. */
export function renderApp(route: string, options: Omit<RenderOptions, "route"> = {}) {
  return renderWithProviders(<AppRoutes />, { ...options, route });
}
