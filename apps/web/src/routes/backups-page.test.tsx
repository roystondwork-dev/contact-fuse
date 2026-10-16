import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { Snapshot } from "../lib/api-types.ts";
import { SNAPSHOT_POLL_INTERVAL_MS } from "../features/backups/use-snapshots.ts";
import { expectNoA11yViolations } from "../test/axe.ts";
import { buildAccount, buildSnapshot } from "../test/fixtures.ts";
import { renderApp } from "../test/render.tsx";
import { apiErrorResponse, server } from "../test/server.ts";

function serveAccounts(accounts = [buildAccount()]) {
  server.use(
    http.get("/api/v1/accounts", () => HttpResponse.json({ items: accounts, nextCursor: null })),
  );
}

function serveSnapshots(state: { snapshots: Snapshot[] }) {
  server.use(
    http.get("/api/v1/snapshots", () =>
      HttpResponse.json({ items: state.snapshots, nextCursor: null }),
    ),
  );
}

describe("BackupsPage", () => {
  it("creates a backup and shows live progress until it completes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    serveAccounts();
    const running = buildSnapshot({
      id: "snap-new",
      status: "running",
      contactCount: 0,
      createdAt: "2026-10-03T10:00:00.000Z",
      progress: { fetched: 0 },
    });
    const state = { snapshots: [] as Snapshot[] };
    const polled: Snapshot[] = [
      { ...running, progress: { fetched: 120 } },
      { ...running, progress: { fetched: 480 } },
      buildSnapshot({ id: "snap-new", contactCount: 512, createdAt: running.createdAt }),
    ];
    let polls = 0;
    serveSnapshots(state);
    server.use(
      http.post("/api/v1/snapshots", () => {
        state.snapshots = [running];
        return HttpResponse.json(running, {
          status: 202,
          headers: { Location: "/api/v1/snapshots/snap-new" },
        });
      }),
      http.get("/api/v1/snapshots/snap-new", () => {
        const snapshot = polled[Math.min(polls, polled.length - 1)];
        polls += 1;
        if (snapshot?.status === "completed") state.snapshots = [snapshot];
        return HttpResponse.json(snapshot);
      }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp("/backups");

    await screen.findByText("No backups yet");
    await user.click(screen.getByRole("button", { name: "Create backup" }));

    expect(await screen.findByText("Backing up your contacts…")).toBeInTheDocument();
    expect(await screen.findByText("120 contacts fetched so far")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create backup" })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(SNAPSHOT_POLL_INTERVAL_MS));
    expect(await screen.findByText("480 contacts fetched so far")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(SNAPSHOT_POLL_INTERVAL_MS));
    expect(await screen.findByText("Backup saved")).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Backups" });
    expect(within(list).getByText("512 contacts · 1 account")).toBeInTheDocument();

    // Polling stops once the backup is no longer running.
    const pollsAfter = polls;
    await act(() => vi.advanceTimersByTimeAsync(SNAPSHOT_POLL_INTERVAL_MS * 3));
    expect(polls).toBe(pollsAfter);
  });

  it("explains why it can't create a backup without a connected account", async () => {
    serveAccounts([buildAccount({ status: "disconnected" })]);
    serveSnapshots({ snapshots: [] });
    renderApp("/backups");

    const button = await screen.findByRole("button", { name: "Create backup" });
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAccessibleDescription("Connect at least one account to create a backup.");
  });

  it("lists backups with per-account counts and export links", async () => {
    serveAccounts();
    serveSnapshots({
      snapshots: [
        buildSnapshot({
          id: "snap-2",
          contactCount: 1204,
          accountCount: 2,
          accounts: [
            { accountId: "acc-1", email: "person.one@example.com", contactCount: 1000 },
            { accountId: "acc-2", email: "person.two@example.com", contactCount: 204 },
          ],
        }),
        buildSnapshot({ id: "snap-1", status: "failed", errorCode: "TOKEN_EXPIRED" }),
      ],
    });
    renderApp("/backups");

    const list = await screen.findByRole("list", { name: "Backups" });
    const [first, second] = within(list).getAllByRole("listitem");
    if (!first || !second) throw new Error("expected two backups");
    expect(within(first).getByText("1,204 contacts · 2 accounts")).toBeInTheDocument();
    expect(within(first).getByRole("cell", { name: "person.two@example.com" })).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: /Export as vCard/ })).toHaveAttribute(
      "href",
      "/api/v1/snapshots/snap-2/export?format=vcf",
    );
    expect(within(first).getByRole("link", { name: /Export as CSV/ })).toHaveAttribute(
      "href",
      "/api/v1/snapshots/snap-2/export?format=csv",
    );
    expect(screen.getByText("Exported files contain personal details")).toBeInTheDocument();
    expect(within(second).getByText("Failed")).toBeInTheDocument();
    expect(within(second).getByText(/Your Google sign-in has expired/)).toBeInTheDocument();
    expect(within(second).queryByRole("link")).not.toBeInTheDocument();
  });

  it("deletes a backup only after confirmation", async () => {
    serveAccounts();
    const state = { snapshots: [buildSnapshot()] };
    serveSnapshots(state);
    let deleted = 0;
    server.use(
      http.delete("/api/v1/snapshots/snap-1", () => {
        deleted += 1;
        state.snapshots = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderApp("/backups");

    await user.click(await screen.findByRole("button", { name: /^Delete backup from/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("This backup of 42 contacts will be deleted");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(deleted).toBe(0);

    await user.click(screen.getByRole("button", { name: /^Delete backup from/ }));
    await user.click(await screen.findByRole("button", { name: "Delete backup" }));

    expect(await screen.findByText("No backups yet")).toBeInTheDocument();
    expect(deleted).toBe(1);
  });

  it("shows the error copy when a backup is already running", async () => {
    serveAccounts();
    serveSnapshots({ snapshots: [] });
    server.use(http.post("/api/v1/snapshots", () => apiErrorResponse(409, "RUN_IN_PROGRESS")));
    const user = userEvent.setup();
    renderApp("/backups");

    await screen.findByText("No backups yet");
    await user.click(screen.getByRole("button", { name: "Create backup" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("A backup is already running");
    expect(alert).toHaveTextContent("Are my contacts safe?");
  });

  it("has no detectable accessibility violations", async () => {
    serveAccounts();
    serveSnapshots({ snapshots: [buildSnapshot()] });
    const { container } = renderApp("/backups");
    await screen.findByRole("list", { name: "Backups" });

    await expectNoA11yViolations(container);
  });
});
