import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "../../../test/axe.ts";
import { CLIENT_SECRET, VALID_CLIENT_ID } from "../../../test/fixtures.ts";
import { renderWithProviders } from "../../../test/render.tsx";
import { apiErrorResponse, server } from "../../../test/server.ts";
import { GoogleClientSetup } from "./google-client-setup.tsx";

function notConfigured() {
  server.use(
    http.get("/api/v1/settings/google-client", () => HttpResponse.json({ configured: false })),
  );
}

function trackPut() {
  const bodies: unknown[] = [];
  server.use(
    http.put("/api/v1/settings/google-client", async ({ request }) => {
      const body = (await request.json()) as { clientId: string };
      bodies.push(body);
      return HttpResponse.json({ configured: true, clientId: body.clientId });
    }),
  );
  return bodies;
}

describe("GoogleClientSetup", () => {
  it("rejects a client ID that doesn't end with .apps.googleusercontent.com", async () => {
    notConfigured();
    const bodies = trackPut();
    const user = userEvent.setup();
    renderWithProviders(<GoogleClientSetup />);

    await user.type(await screen.findByLabelText("Client ID"), "1234-test.example.com");
    await user.type(screen.getByLabelText("Client secret"), CLIENT_SECRET);
    await user.click(screen.getByRole("button", { name: "Save Google client" }));

    const clientId = screen.getByLabelText("Client ID");
    expect(clientId).toHaveAttribute("aria-invalid", "true");
    expect(clientId).toHaveAccessibleDescription(/must end with \.apps\.googleusercontent\.com/);
    expect(clientId).toHaveFocus();
    expect(bodies).toEqual([]);
  });

  it("requires a client secret", async () => {
    notConfigured();
    const bodies = trackPut();
    const user = userEvent.setup();
    renderWithProviders(<GoogleClientSetup />);

    await user.type(await screen.findByLabelText("Client ID"), VALID_CLIENT_ID);
    await user.click(screen.getByRole("button", { name: "Save Google client" }));

    expect(screen.getByLabelText("Client secret")).toHaveAccessibleDescription(
      "Enter your client secret.",
    );
    expect(bodies).toEqual([]);
  });

  it("uses a password field for the secret and never shows it after saving", async () => {
    notConfigured();
    const bodies = trackPut();
    const user = userEvent.setup();
    renderWithProviders(<GoogleClientSetup />);

    const secretInput = await screen.findByLabelText("Client secret");
    expect(secretInput).toHaveAttribute("type", "password");
    await user.type(screen.getByLabelText("Client ID"), VALID_CLIENT_ID);
    await user.type(secretInput, CLIENT_SECRET);
    await user.click(screen.getByRole("button", { name: "Save Google client" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText(VALID_CLIENT_ID)).toBeInTheDocument();
    expect(bodies).toEqual([{ clientId: VALID_CLIENT_ID, clientSecret: CLIENT_SECRET }]);
    expect(document.body.textContent).not.toContain(CLIENT_SECRET);
    for (const input of document.querySelectorAll("input")) {
      expect(input.value).not.toContain(CLIENT_SECRET);
    }

    // Replacing starts from an empty form: the old secret is not pre-filled.
    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(screen.getByLabelText("Client secret")).toHaveValue("");
  });

  it("shows the server's clientId validation error on the field", async () => {
    notConfigured();
    server.use(
      http.put("/api/v1/settings/google-client", () =>
        apiErrorResponse(400, "VALIDATION_FAILED", { fields: "clientId" }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<GoogleClientSetup />);

    await user.type(await screen.findByLabelText("Client ID"), VALID_CLIENT_ID);
    await user.type(screen.getByLabelText("Client secret"), CLIENT_SECRET);
    await user.click(screen.getByRole("button", { name: "Save Google client" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Client ID")).toHaveAttribute("aria-invalid", "true"),
    );
    expect(screen.queryByText(/server message/)).not.toBeInTheDocument();
  });

  it("removes a saved client after confirmation", async () => {
    let isDeleted = false;
    server.use(
      http.delete("/api/v1/settings/google-client", () => {
        isDeleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<GoogleClientSetup />);

    await user.click(await screen.findByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Remove client" }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(isDeleted).toBe(true);
    expect(await screen.findByLabelText("Client ID")).toHaveValue("");
  });

  it("has no detectable accessibility violations", async () => {
    notConfigured();
    const { container } = renderWithProviders(<GoogleClientSetup />);
    await screen.findByLabelText("Client ID");

    await expectNoA11yViolations(container);
  });
});
