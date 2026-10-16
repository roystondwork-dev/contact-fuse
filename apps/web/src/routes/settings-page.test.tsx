import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "../lib/theme.ts";
import { expectNoA11yViolations } from "../test/axe.ts";
import { CSRF_TOKEN } from "../test/fixtures.ts";
import { renderApp } from "../test/render.tsx";
import { server } from "../test/server.ts";

describe("SettingsPage", () => {
  it("only enables Delete all local data once DELETE is typed exactly", async () => {
    const requests: { body: unknown; csrf: string | null }[] = [];
    let isConfigured = true;
    server.use(
      http.get("/api/v1/settings/google-client", () =>
        HttpResponse.json(
          isConfigured
            ? { configured: true, clientId: "1234-test.apps.googleusercontent.com" }
            : { configured: false },
        ),
      ),
      http.post("/api/v1/local-data/delete", async ({ request }) => {
        requests.push({ body: await request.json(), csrf: request.headers.get("x-csrf-token") });
        isConfigured = false;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderApp("/settings");

    await user.click(await screen.findByRole("button", { name: "Delete all local data" }));
    const dialog = await screen.findByRole("alertdialog");
    const input = within(dialog).getByLabelText("Type DELETE to confirm");
    const confirm = within(dialog).getByRole("button", { name: "Delete all local data" });
    expect(input).toHaveFocus();
    expect(confirm).toBeDisabled();

    await user.type(input, "delete");
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, "DELETE ");
    expect(confirm).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(requests).toEqual([]);

    await user.clear(input);
    await user.type(input, "DELETE");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(await screen.findByText("All local data was deleted")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Tidy up your contacts" })).toBeVisible();
    expect(await screen.findByLabelText("Client ID")).toBeInTheDocument();
    expect(requests).toEqual([{ body: { confirm: "DELETE" }, csrf: CSRF_TOKEN }]);
  });

  it("stores the theme choice and applies it to <html>", async () => {
    const user = userEvent.setup();
    renderApp("/settings");

    await user.click(await screen.findByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderApp("/settings");
    await screen.findByText("Saved");

    await expectNoA11yViolations(container);
  });
});

describe("first run", () => {
  it("sends / to the welcome setup when the Google client isn't configured", async () => {
    server.use(
      http.get("/api/v1/settings/google-client", () => HttpResponse.json({ configured: false })),
    );
    const { container } = renderApp("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tidy up your contacts" }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Client secret")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: /Open the step-by-step guide/ })).toHaveAttribute(
      "href",
      "https://github.com/roystondwork-dev/contact-fuse/blob/main/docs/guides/google-cloud-setup.md",
    );
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("sends / to Accounts when the Google client is configured", async () => {
    renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
  });

  it("theme toggle in the header cycles System, Light and Dark", async () => {
    const user = userEvent.setup();
    renderApp("/accounts");

    await user.click(await screen.findByRole("button", { name: /^Theme: System/ }));
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.click(screen.getByRole("button", { name: /^Theme: Light/ }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: /^Theme: Dark/ })).toBeInTheDocument();
  });
});
