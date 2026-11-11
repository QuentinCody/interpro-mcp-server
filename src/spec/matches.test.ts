/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { interproCatalog } from "./catalog";
import { matchesEndpoints } from "./matches";

describe("Matches discovery examples", () => {
  it("executes the provider checksum examples through GET and POST", async () => {
    const api = { get: vi.fn().mockResolvedValue({ md5: "116E31DDA297A0F45F6E1025E722D62B", matches: [] }), post: vi.fn().mockResolvedValue({ results: [] }) };
    for (const endpoint of matchesEndpoints.filter(e => e.example)) {
      await runInNewContext(`(async () => {${endpoint.example}})()`, { api });
    }
    expect(api.get).toHaveBeenCalledWith("/matches/116E31DDA297A0F45F6E1025E722D62B");
    expect(api.post).toHaveBeenCalledWith("/matches", { md5: ["116E31DDA297A0F45F6E1025E722D62B", "0".repeat(32)] });
  });
  it("exposes sequence lookup and retains ordinary InterPro discovery", () => {
    expect(interproCatalog.endpoints).toEqual(expect.arrayContaining(matchesEndpoints));
    expect(interproCatalog.endpoints.some(e => e.path === "/entry/interpro/")).toBe(true);
    expect(interproCatalog.endpointCount).toBe(interproCatalog.endpoints.length);
  });
});
