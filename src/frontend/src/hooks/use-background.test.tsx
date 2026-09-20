import { BackgroundProvider, useBackground } from "@/hooks/use-background";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// A tiny probe that exposes the hook's controller to the test without going
// through the settings page, so each branch can be driven directly. The setup
// file maps `getByTestId` to `data-ocid`, so the probe uses that attribute.
function Probe({ file }: { file: File }) {
  const { background, error, isBusy, setFromFile, reset } = useBackground();
  return (
    <div>
      <span data-ocid="probe.background">{background ?? "none"}</span>
      <span data-ocid="probe.error">{error ?? "none"}</span>
      <span data-ocid="probe.busy">{isBusy ? "yes" : "no"}</span>
      <button type="button" onClick={() => void setFromFile(file)}>
        upload
      </button>
      <button type="button" onClick={reset}>
        reset
      </button>
    </div>
  );
}

function renderProbe(file: File) {
  return render(
    <BackgroundProvider>
      <Probe file={file} />
    </BackgroundProvider>,
  );
}

const smallImage = () =>
  new File(["fake-image"], "bg.png", { type: "image/png" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBackground", () => {
  it("throws a clear error when used outside the provider", () => {
    // React logs the thrown error; silence it so the run stays readable.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe file={smallImage()} />)).toThrow(
      "useBackground harus dipakai di dalam BackgroundProvider.",
    );
    spy.mockRestore();
  });

  it("rejects an image larger than the 2 MB cap without touching storage", async () => {
    const user = userEvent.setup();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    renderProbe(big);

    await user.click(screen.getByRole("button", { name: "upload" }));

    expect(screen.getByTestId("probe.error")).toHaveTextContent(
      "Ukuran gambar maksimal 2 MB.",
    );
    expect(screen.getByTestId("probe.background")).toHaveTextContent("none");
    expect(window.localStorage.getItem("celengan.background")).toBeNull();
  });

  it("surfaces a storage failure instead of pretending the image was saved", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const user = userEvent.setup();
    renderProbe(smallImage());

    await user.click(screen.getByRole("button", { name: "upload" }));

    await waitFor(() =>
      expect(screen.getByTestId("probe.error")).toHaveTextContent(
        "Gambar gagal disimpan di penyimpanan browser. Coba gambar yang lebih kecil.",
      ),
    );
    expect(screen.getByTestId("probe.background")).toHaveTextContent("none");
  });

  it("clears the stored background and the error on reset", async () => {
    window.localStorage.setItem(
      "celengan.background",
      "data:image/png;base64,AAAA",
    );
    const user = userEvent.setup();
    renderProbe(smallImage());

    await waitFor(() =>
      expect(screen.getByTestId("probe.background")).toHaveTextContent(
        "data:image/png;base64,AAAA",
      ),
    );

    await user.click(screen.getByRole("button", { name: "reset" }));

    expect(screen.getByTestId("probe.background")).toHaveTextContent("none");
    expect(window.localStorage.getItem("celengan.background")).toBeNull();
  });
});
