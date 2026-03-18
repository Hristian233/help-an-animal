import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import axios from "axios";

import App from "./App";
import { ToastProvider } from "./context/ToastProvider";

vi.mock("@react-google-maps/api", () => {
  return {
    useJsApiLoader: () => ({ isLoaded: true }),
    GoogleMap: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="google-map">{children}</div>
    ),
    Marker: () => null,
    InfoWindow: () => null,
  };
});

vi.mock("axios");

describe("backend down UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows backend-unavailable screen when markers load fails", async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network Error"));

    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    );

    expect(
      await screen.findByText("Временно недостъпна услуга"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Опитай отново" })).toBeVisible();

    // Ensure the FAB isn't rendered behind an error page.
    expect(screen.queryByRole("button", { name: "+" })).not.toBeInTheDocument();
  });
});

