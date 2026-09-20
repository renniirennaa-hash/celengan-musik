import { BackgroundProvider } from "@/hooks/use-background";
import { SettingsPage } from "@/pages/SettingsPage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

function renderPage() {
  return render(
    <BackgroundProvider>
      <SettingsPage />
    </BackgroundProvider>,
  );
}

describe("SettingsPage background", () => {
  it("shows the default state when no background is stored", async () => {
    renderPage();
    expect(
      await screen.findByText("Belum ada background khusus"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Menggunakan default" }),
    ).toBeDisabled();
  });

  it("uploads an image, previews it, and persists it to localStorage", async () => {
    const user = userEvent.setup();
    renderPage();

    const file = new File(["fake-image"], "bg.png", { type: "image/png" });
    await user.upload(screen.getByTestId("settings.upload_button"), file);

    expect(
      await screen.findByRole("img", {
        name: "Pratinjau background aplikasi",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.localStorage.getItem("celengan.background")).toContain(
        "data:image/png;base64",
      ),
    );
  });

  it("rejects a non-image file with a clear error", async () => {
    renderPage();

    // `accept="image/*"` blocks this in a real browser; fire the change
    // directly to exercise the hook's own validation branch.
    const file = new File(["not-an-image"], "notes.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByTestId("settings.upload_button"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText(
        "Berkas harus berupa gambar (JPG, PNG, atau WebP).",
      ),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("celengan.background")).toBeNull();
  });

  it("restores the default background when the stored image is removed", async () => {
    window.localStorage.setItem(
      "celengan.background",
      "data:image/png;base64,AAAA",
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Hapus background" }),
    );

    await waitFor(() =>
      expect(window.localStorage.getItem("celengan.background")).toBeNull(),
    );
    expect(
      await screen.findByText("Belum ada background khusus"),
    ).toBeInTheDocument();
  });
});
