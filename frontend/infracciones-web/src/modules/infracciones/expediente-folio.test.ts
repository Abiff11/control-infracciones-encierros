import { describe, expect, it } from "vitest";

import {
  buildVehiculoSinInfraccionFolio,
  DOCUMENTO_FOLIO_LIBERACION,
  DOCUMENTO_PARTE_INFORMATIVO,
} from "./expediente-folio";

describe("buildVehiculoSinInfraccionFolio", () => {
  it("muestra PI- antes de capturar una parte informativa", () => {
    expect(
      buildVehiculoSinInfraccionFolio(DOCUMENTO_PARTE_INFORMATIVO, ""),
    ).toBe("PI-");
  });

  it("muestra vacio antes de capturar un folio de liberacion", () => {
    expect(
      buildVehiculoSinInfraccionFolio(DOCUMENTO_FOLIO_LIBERACION, ""),
    ).toBe("");
  });

  it("genera PI-12345 para parte informativo", () => {
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_PARTE_INFORMATIVO,
        "12345",
      ),
    ).toBe("PI-12345");
  });

  it("usa el folio de liberacion sin prefijo", () => {
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_FOLIO_LIBERACION,
        "ABC-456",
      ),
    ).toBe("ABC-456");
  });

  it("cambia el resultado al cambiar el tipo de documento", () => {
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_PARTE_INFORMATIVO,
        "12345",
      ),
    ).toBe("PI-12345");
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_FOLIO_LIBERACION,
        "12345",
      ),
    ).toBe("12345");
  });

  it("restaura PI- al volver de folio de liberacion a parte informativo", () => {
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_FOLIO_LIBERACION,
        "12345",
      ),
    ).toBe("12345");
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_PARTE_INFORMATIVO,
        "12345",
      ),
    ).toBe("PI-12345");
  });

  it("no duplica el prefijo PI-", () => {
    expect(
      buildVehiculoSinInfraccionFolio(
        DOCUMENTO_PARTE_INFORMATIVO,
        "PI-12345",
      ),
    ).toBe("PI-12345");
  });
});
