import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account } from "../lib/api-types.ts";
import {
  CONNECT_POLL_INTERVAL_MS,
  CONNECT_TIMEOUT_MS,
} from "../features/accounts/use-connect-flow.ts";
import { expectNoA11yViolations } from "../test/axe.ts";
import { buildAccount } from "../test/fixtures.ts";
import { renderApp } from "../test/render.tsx";
import { apiErrorResponse, server } from "../test/server.ts";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic";

/** Serves a mutable account list and counts how often it was fetched. */
function serveAccounts(initial: Account[]) {
  const state = { accounts: initial, fetches: 0 };
  server.use(
    http.get("/api/v1/accounts", () => {
      state.fetches += 1;
      return HttpResponse.json({ items: state.accounts, nextCursor: null });
    }),
  );
  return state;
}

function serveConnect() {
  const bodies: unknown[] = [];
  server.use(
    http.post("/api/v1/accounts/connect", async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ authorizationUrl: AUTH_URL });
    }),
  );
  return bodies;
}

describe("AccountsPage", () => {
  describe("connect flow", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens Google in a new tab, polls every 3 s and stops when the account appears", async () => {
      const state = serveAccounts([]);
      const connectBodies = serveConnect();
      const openSpy = vi.spyOn(window, "open").mockReturnValue({ opener: window } as Window);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/accounts");

      await screen.findByText("No accounts yet");
      await user.click(screen.getByRole("switch", { name: "Also include Other contacts" }));
      await user.click(screen.getByRole("button", { name: "Connect Google account" }));

      expect(await screen.findByText("Waiting for you to sign in to Google")).toBeInTheDocument();
      expect(connectBodies).toEqual([{ provider: "google", includeOtherContacts: true }]);
      expect(openSpy).toHaveBeenCalledWith(AUTH_URL, "_blank");
      expect(screen.getByRole("button", { name: "Connect Google account" })).toBeDisabled();

      const fetchesBefore = state.fetches;
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS));
      await waitFor(() => expect(state.fetches).toBe(fetchesBefore + 1));
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS));
      await waitFor(() => expect(state.fetches).toBe(fetchesBefore + 2));

      state.accounts = [buildAccount({ includesOtherContacts: true })];
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS));

      expect(await screen.findByText("Connected person.one@example.com")).toBeInTheDocument();
      const list = screen.getByRole("list", { name: "Google accounts" });
      expect(within(list).getByText("person.one@example.com")).toBeInTheDocument();

      // Polling has stopped.
      const fetchesAfter = state.fetches;
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS * 3));
      expect(state.fetches).toBe(fetchesAfter);
    });

    it("refetches when the window regains focus while waiting", async () => {
      const state = serveAccounts([]);
      serveConnect();
      vi.spyOn(window, "open").mockReturnValue({ opener: window } as Window);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/accounts");

      await screen.findByText("No accounts yet");
      await user.click(screen.getByRole("button", { name: "Connect Google account" }));
      await screen.findByText("Waiting for you to sign in to Google");
      const fetchesBefore = state.fetches;

      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      await waitFor(() => expect(state.fetches).toBe(fetchesBefore + 1));
    });

    it("treats a reconnected account as done without adding a duplicate", async () => {
      const state = serveAccounts([buildAccount({ status: "needs-reauth" })]);
      serveConnect();
      vi.spyOn(window, "open").mockReturnValue({ opener: window } as Window);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/accounts");

      expect(await screen.findByText("Sign-in expired")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Reconnect person.one@example.com" }));
      await screen.findByText("Waiting for you to sign in to Google");

      state.accounts = [buildAccount({ status: "connected" })];
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS));

      expect(await screen.findByText("Connected person.one@example.com")).toBeInTheDocument();
      const list = screen.getByRole("list", { name: "Google accounts" });
      expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    });

    it("stops checking after 5 minutes and lets the user check again", async () => {
      const state = serveAccounts([]);
      serveConnect();
      vi.spyOn(window, "open").mockReturnValue({ opener: window } as Window);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/accounts");

      await screen.findByText("No accounts yet");
      await user.click(screen.getByRole("button", { name: "Connect Google account" }));
      await screen.findByText("Waiting for you to sign in to Google");

      await act(() => vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS));

      expect(
        await screen.findByText("We stopped checking for the new account"),
      ).toBeInTheDocument();
      const fetchesAfterTimeout = state.fetches;
      await act(() => vi.advanceTimersByTimeAsync(CONNECT_POLL_INTERVAL_MS * 3));
      expect(state.fetches).toBe(fetchesAfterTimeout);

      await user.click(screen.getByRole("button", { name: "Check again" }));
      await waitFor(() => expect(state.fetches).toBeGreaterThan(fetchesAfterTimeout));
      expect(screen.getByText("Waiting for you to sign in to Google")).toBeInTheDocument();
    });

    it("offers a link when the browser blocks the new tab", async () => {
      serveAccounts([]);
      serveConnect();
      vi.spyOn(window, "open").mockReturnValue(null);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/accounts");

      await screen.findByText("No accounts yet");
      await user.click(screen.getByRole("button", { name: "Connect Google account" }));

      expect(await screen.findByText(/Your browser blocked the new tab/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Open Google sign-in/ })).toHaveAttribute(
        "href",
        AUTH_URL,
      );
    });
  });

  it("shows the error copy when the Google client is missing", async () => {
    serveAccounts([]);
    server.use(
      http.post("/api/v1/accounts/connect", () => apiErrorResponse(412, "OAUTH_CLIENT_MISSING")),
    );
    const user = userEvent.setup();
    renderApp("/accounts");

    await screen.findByText("No accounts yet");
    await user.click(screen.getByRole("button", { name: "Connect Google account" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Google isn't set up yet");
    expect(alert).toHaveTextContent("Are my contacts safe?");
    expect(alert).not.toHaveTextContent("server message");
  });

  it("disables connecting until the Google client is set up", async () => {
    serveAccounts([]);
    server.use(
      http.get("/api/v1/settings/google-client", () => HttpResponse.json({ configured: false })),
    );
    renderApp("/accounts");

    expect(await screen.findByText("Set up Google first")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Google account" })).toBeDisabled();
  });

  it("disconnects an account after confirming that backups are kept", async () => {
    const state = serveAccounts([buildAccount()]);
    let deletedId: string | undefined;
    server.use(
      http.delete("/api/v1/accounts/:id", ({ params }) => {
        deletedId = String(params["id"]);
        state.accounts = [buildAccount({ status: "disconnected" })];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderApp("/accounts");

    await user.click(
      await screen.findByRole("button", { name: "Disconnect person.one@example.com" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Your backups of it are kept");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Disconnect account" }));

    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(deletedId).toBe("acc-1");
  });

  it("shows a retryable error when accounts fail to load", async () => {
    server.use(http.get("/api/v1/accounts", () => apiErrorResponse(500, "INTERNAL_ERROR")));
    renderApp("/accounts");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something unexpected happened");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    serveAccounts([
      buildAccount({ isMain: true }),
      buildAccount({ id: "acc-2", email: "person.two@example.com", status: "needs-reauth" }),
    ]);
    const { container } = renderApp("/accounts");
    await screen.findByText("person.two@example.com");

    await expectNoA11yViolations(container);
  });
});
