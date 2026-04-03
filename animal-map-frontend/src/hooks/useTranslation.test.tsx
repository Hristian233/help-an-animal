import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useT } from "./useTranslation";

describe("useT", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useT());
    expect(typeof result.current).toBe("function");
  });

  it("returns translated string for known key", () => {
    const { result } = renderHook(() => useT());
    const t = result.current;
    expect(t("addAnimal")).toBe("Добави животно");
    expect(t("loading")).toBe("Зареждане...");
  });

  it("returns translated string for nested key", () => {
    const { result } = renderHook(() => useT());
    const t = result.current;
    expect(t("buttons.addAnimal")).toBe("Добави животно");
    expect(t("modal.save")).toBe("Запази");
    expect(t("animals.fox")).toBe("Лисица");
  });

  it("returns key when translation is missing", () => {
    const { result } = renderHook(() => useT());
    const t = result.current;
    expect(t("nonexistent.key")).toBe("nonexistent.key");
    expect(t("unknown")).toBe("unknown");
  });

  it("returns key for deeply nested missing path", () => {
    const { result } = renderHook(() => useT());
    const t = result.current;
    expect(t("buttons.fake.subkey")).toBe("buttons.fake.subkey");
  });
});
