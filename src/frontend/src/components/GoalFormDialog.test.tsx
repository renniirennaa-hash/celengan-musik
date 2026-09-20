import { GoalFormDialog } from "@/components/GoalFormDialog";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

function renderDialog(onSubmit = vi.fn()) {
  render(
    <GoalFormDialog
      open
      onOpenChange={() => {}}
      onSubmit={onSubmit}
      isPending={false}
      submitError={null}
    />,
  );
  return onSubmit;
}

describe("GoalFormDialog", () => {
  it("blocks submission and reports a clear error when no photo is uploaded", async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nama target"), "Liburan");
    await user.type(screen.getByLabelText("Nominal target (Rp)"), "15000000");
    await user.type(screen.getByLabelText("Tanggal tujuan"), "2026-12-31");
    await user.click(screen.getByRole("button", { name: "Simpan target" }));

    expect(
      await screen.findByText("Foto target wajib diunggah."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a target date earlier than the start date", async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nama target"), "Liburan");
    await user.type(screen.getByLabelText("Nominal target (Rp)"), "15000000");
    await user.clear(screen.getByLabelText("Tanggal mulai"));
    await user.type(screen.getByLabelText("Tanggal mulai"), "2026-06-01");
    await user.type(screen.getByLabelText("Tanggal tujuan"), "2026-05-01");
    await user.click(screen.getByRole("button", { name: "Simpan target" }));

    expect(
      await screen.findByText(
        "Tanggal tujuan tidak boleh sebelum tanggal mulai.",
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits parsed values once a photo is attached", async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nama target"), "Liburan");
    await user.type(screen.getByLabelText("Nominal target (Rp)"), "15000000");
    await user.clear(screen.getByLabelText("Tanggal mulai"));
    await user.type(screen.getByLabelText("Tanggal mulai"), "2026-01-01");
    await user.type(screen.getByLabelText("Tanggal tujuan"), "2026-12-31");

    const file = new File(["fake"], "target.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Foto target (wajib)"), file);

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "Pratinjau foto target" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Simpan target" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Liburan",
        targetAmount: 15_000_000n,
        startDate: "2026-01-01",
        targetDate: "2026-12-31",
      }),
    );
  });
});
