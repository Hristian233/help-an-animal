import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AddMarkerModal } from "./AddMarkerModal";
import { ToastProvider } from "../context/ToastProvider";

const defaultProps = {
  lat: 42.7,
  lng: 23.3,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(true),
};

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("AddMarkerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:mock-preview-url"),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          upload_url: "https://storage.example.com/upload",
          public_url: "https://storage.example.com/image.png",
        }),
      }),
    );
  });

  it("add mode shows empty form", () => {
    renderWithToast(
      <AddMarkerModal {...defaultProps} onSave={defaultProps.onSave} />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("edit mode shows initialMarker data", () => {
    const initialMarker = {
      id: 1,
      animal: "fox",
      lat: 42.7,
      lng: 23.3,
      image_url: "https://example.com/fox.png",
    };
    renderWithToast(
      <AddMarkerModal
        {...defaultProps}
        initialMarker={initialMarker}
        onUpdate={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByDisplayValue("Лисица")).toBeInTheDocument();
  });

  it("changing animal updates form", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <AddMarkerModal {...defaultProps} onSave={defaultProps.onSave} />,
    );
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Котка" }),
    );
    expect(screen.getByDisplayValue("Котка")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <AddMarkerModal {...defaultProps} onSave={defaultProps.onSave} />,
    );
    await user.click(screen.getByRole("button", { name: /отказ/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("edit mode: submit calls onUpdate with correct payload", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    const initialMarker = {
      id: 42,
      animal: "dog",
      lat: 42.7,
      lng: 23.3,
      image_url: "https://example.com/dog.png",
    };
    renderWithToast(
      <AddMarkerModal
        {...defaultProps}
        initialMarker={initialMarker}
        onUpdate={onUpdate}
      />,
    );
    await user.click(screen.getByRole("button", { name: /запази/i }));

    expect(onUpdate).toHaveBeenCalledWith(42, {
      animal: "dog",
      lat: 42.7,
      lng: 23.3,
      image_url: "https://example.com/dog.png",
    });
  });

  it("add mode: submit with file calls onSave with correct payload", async () => {
    const user = userEvent.setup();
    const file = new File(["image content"], "test.png", { type: "image/png" });
    renderWithToast(
      <AddMarkerModal {...defaultProps} onSave={defaultProps.onSave} />,
    );
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Лисица" }),
    );
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole("button", { name: /запази/i }));

    await vi.waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith({
        animal: "fox",
        lat: 42.7,
        lng: 23.3,
        image_url: "https://storage.example.com/image.png",
      });
    });
  });

  it("file size validation shows toast when file exceeds 10 MB", async () => {
    const user = userEvent.setup();
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });
    renderWithToast(
      <AddMarkerModal {...defaultProps} onSave={defaultProps.onSave} />,
    );
    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Лисица" }),
    );
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, largeFile);
    await user.click(screen.getByRole("button", { name: /запази/i }));

    await vi.waitFor(() => {
      expect(screen.getByText("Image exceeds 10 MB limit")).toBeInTheDocument();
    });
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });
});
