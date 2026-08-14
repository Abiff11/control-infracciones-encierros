import { describe, expect, it } from "vitest";

import {
  APP_TIME_ZONE,
  dateTimeLocalToIso,
  formatDateInput,
  formatDateTimeLocalInput,
  formatTimeInput,
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

  it("mantiene la fecha civil de Oaxaca cuando UTC ya avanzo al dia siguiente", () => {
    const instant = new Date("2026-08-14T00:30:00.000Z");

    expect(formatDateInput(instant)).toBe("2026-08-13");
    expect(formatTimeInput(instant)).toBe("18:30");
  });

  it("mantiene el cambio de dia al convertir una hora nocturna de Oaxaca", () => {
    expect(dateTimeLocalToIso("2026-08-13T23:30")).toBe(
      "2026-08-14T05:30:00.000Z",
    );
  });

  it("usa la zona institucional esperada", () => {
    expect(APP_TIME_ZONE).toBe("America/Mexico_City");
  });

  it("rechaza fechas locales imposibles", () => {
    expect(() => dateTimeLocalToIso("2026-02-30T12:00")).toThrow(RangeError);
  });
});
