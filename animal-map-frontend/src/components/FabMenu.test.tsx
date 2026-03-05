import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FabMenu from "./FabMenu";

describe("FabMenu", () => {
  const onAddAnimal = vi.fn();
  const onCheckNearby = vi.fn();
  const onCenterLocation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the main FAB button", () => {
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    const mainButton = screen.getByRole("button", { name: "+" });
    expect(mainButton).toBeInTheDocument();
  });

  it("does not show secondary buttons initially", () => {
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    expect(screen.queryByText("Добави животно")).not.toBeInTheDocument();
  });

  it("expands to show secondary buttons when main FAB is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    const mainButton = screen.getByRole("button", { name: "+" });
    await user.click(mainButton);
    expect(screen.getByText("Добави животно")).toBeInTheDocument();
    expect(screen.getByText("Провери наблизо")).toBeInTheDocument();
    expect(screen.getByText("Центрирай")).toBeInTheDocument();
  });

  it("calls onAddAnimal when Add Animal button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "+" }));
    await user.click(screen.getByText("Добави животно"));
    expect(onAddAnimal).toHaveBeenCalledTimes(1);
  });

  it("calls onCheckNearby when Check Nearby button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "+" }));
    await user.click(screen.getByText("Провери наблизо"));
    expect(onCheckNearby).toHaveBeenCalledTimes(1);
  });

  it("calls onCenterLocation when Center button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "+" }));
    await user.click(screen.getByText("Центрирай"));
    expect(onCenterLocation).toHaveBeenCalledTimes(1);
  });

  it("collapses when main FAB is clicked again", async () => {
    const user = userEvent.setup();
    render(
      <FabMenu
        onAddAnimal={onAddAnimal}
        onCheckNearby={onCheckNearby}
        onCenterLocation={onCenterLocation}
      />,
    );
    const mainButton = screen.getByRole("button", { name: "+" });
    await user.click(mainButton);
    expect(screen.getByText("Добави животно")).toBeInTheDocument();
    await user.click(mainButton);
    expect(screen.queryByText("Добави животно")).not.toBeInTheDocument();
    expect(mainButton).toHaveTextContent("+");
  });
});
