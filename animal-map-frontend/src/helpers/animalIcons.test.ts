import { describe, expect, it } from "vitest";
import { animalIcons } from "./animalIcons";

describe("animalIcons", () => {
  it("contains fox, dog, cat keys", () => {
    expect(animalIcons).toHaveProperty("fox");
    expect(animalIcons).toHaveProperty("dog");
    expect(animalIcons).toHaveProperty("cat");
  });

  it("maps each animal to an icon path", () => {
    expect(animalIcons.fox).toBe("/icons/fox.png");
    expect(animalIcons.dog).toBe("/icons/dog.png");
    expect(animalIcons.cat).toBe("/icons/cat.png");
  });

  it("returns string values for all entries", () => {
    Object.values(animalIcons).forEach((path) => {
      expect(typeof path).toBe("string");
      expect(path).toMatch(/^\/icons\/\w+\.png$/);
    });
  });
});
