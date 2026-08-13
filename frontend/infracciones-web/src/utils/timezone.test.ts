import { describe, expect, it } from "vitest";

import {
  APP_TIME_ZONE,
  dateTimeLocalToIso,
  formatDateTimeLocalInput,
} from "./timezone";

describe("timezone Oaxaca", () => {
  it("formatea un instante UTC como hora local de Oaxaca para datetime-local", () => {
    const instant = new Date("2026-08-13T21:07:47.021Z");

    expect(formatDateTimeLocalInput(instant)).toBe("2026-08-13T15:07");
  });

  it("convierte una hora local de Oaxaca al instante UTC correcto", () => {
    expect(dateTimeLocalToIso("2026-08-13T15:07")).toBe(
      "2026-08-13T21:07:00.000Z",
    );
  });

  it("mantiene el cambio de dia al convertir una hora nocturna de Oaxaca", () => {
    expect(dateTimeLocalToIso("2026-08-13T23:30")).toBe(
      "2026-08-14T05:30:00.000Z",
    );
  });

  it("hace round-trip entre instante UTC y datetime-local de Oaxaca", () => {
    const iso = dateTimeLocalToIso("2026-08-13T15:07");

    expect(iso).toBeDefined();
    expect(formatDateTimeLocalInput(new Date(iso as string))).toBe(
      "2026-08-13T15:07",
    );
  });

  it("usa la zona institucional esperada", () => {
    expect(APP_TIME_ZONE).toBe("America/Mexico_City");
  });

  it("rechaza fechas locales imposibles", () => {
    expect(() => dateTimeLocalToIso("2026-02-30T12:00")).toThrow(RangeError);
  });
});
