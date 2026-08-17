import { describe, expect, it } from "vitest";

import { resolveApiUrl } from "./apiConfig";

describe("resolveApiUrl", () => {
  it("prefiere /api cuando no hay configuracion", () => {
    expect(
      resolveApiUrl(undefined, {
        isDev: true,
        browserHostname: "127.0.0.1",
      }),
    ).toBe("/api");
  });

  it("mantiene una ruta relativa same-origin", () => {
    expect(
      resolveApiUrl("/api/", {
        isDev: true,
        browserHostname: "127.0.0.1",
      }),
    ).toBe("/api");
  });

  it("alinea localhost con 127.0.0.1 durante desarrollo", () => {
    expect(
      resolveApiUrl("http://localhost:3000/api", {
        isDev: true,
        browserHostname: "127.0.0.1",
      }),
    ).toBe("http://127.0.0.1:3000/api");
  });

  it("alinea 127.0.0.1 con localhost durante desarrollo", () => {
    expect(
      resolveApiUrl("http://127.0.0.1:3000/api", {
        isDev: true,
        browserHostname: "localhost",
      }),
    ).toBe("http://localhost:3000/api");
  });

  it("no reescribe hostnames en produccion", () => {
    expect(
      resolveApiUrl("https://api.example.test/api", {
        isDev: false,
        browserHostname: "app.example.test",
      }),
    ).toBe("https://api.example.test/api");
  });
});
