import { describe, expect, it } from "vitest";

import { formatDateInput, formatTimeInput } from "./timezone";

describe("timezone fecha civil Oaxaca", () => {
  it("mantiene la fecha civil institucional al cruzar UTC", () => {
    const instant = new Date("2026-08-14T00:30:00.000Z");

    expect(formatDateInput(instant)).toBe("2026-08-13");
    expect(formatTimeInput(instant)).toBe("18:30");
  });
});
