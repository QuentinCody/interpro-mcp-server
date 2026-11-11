import { afterEach, describe, expect, it, vi } from "vitest";
import { createInterproApiFetch } from "./api-adapter";

const checksum = "116E31DDA297A0F45F6E1025E722D62B";
const base = "https://www.ebi.ac.uk/interpro/matches/api";
const api = createInterproApiFetch();
afterEach(() => vi.unstubAllGlobals());

describe("InterPro Matches API contract", () => {
  it("routes single lookups to the separate API without DRF trailing slash normalization", async () => {
    const data = { md5: checksum, matches: [{ source: "InterPro-N", signature: { accession: "PF01619", signatureLibraryRelease: { library: "Pfam", version: "37.3" } }, locations: [{ start: 100, end: 399, score: 0.9999923 }] }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data)); vi.stubGlobal("fetch", fetchMock);
    expect(await api({ method: "GET", path: `/matches/${checksum}/` })).toEqual({ status: 200, data, completeness: expect.objectContaining({ complete: false, returned: 1 }) });
    expect(fetchMock).toHaveBeenCalledWith(`${base}/matches/${checksum}`, expect.objectContaining({ method: "GET" }));
  });

  it("preserves batch found flags, sources and missing-sequence semantics", async () => {
    const data = { results: [{ md5: checksum, found: true, matches: [{ source: "Pfam" }, { source: "InterPro-N" }] }, { md5: "0".repeat(32), found: false, matches: [] }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data)); vi.stubGlobal("fetch", fetchMock);
    expect((await api({ method: "POST", path: "/matches", body: { md5: [checksum, "0".repeat(32)] } })).data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith(`${base}/matches`, expect.objectContaining({ method: "POST", body: JSON.stringify({ md5: [checksum, "0".repeat(32)] }) }));
  });

  it.each(["abc", ">one protein\na b\nc\n"])("normalizes a single protein and uses its standard MD5 identifier: %s", async (sequence) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [] })); vi.stubGlobal("fetch", fetchMock);
    await api({ method: "POST", path: "/matches/sequence", body: { sequence } });
    expect(fetchMock).toHaveBeenCalledWith(`${base}/matches`, expect.objectContaining({ body: '{"md5":["902FBDD2B1DF0C4F70B4A5D23525E932"]}' }));
  });

  it.each([
    { method: "POST", path: "/matches", body: { md5: [] } },
    { method: "POST", path: "/matches", body: { md5: Array(101).fill(checksum) } },
    { method: "POST", path: "/matches", body: { md5: ["invalid"] } },
    { method: "GET", path: "/matches/not-md5" },
    { method: "DELETE", path: "/matches" },
    ...[">header-only", ">one\nAC\n>two\nDE", "AC-DE", "AC*", ""].map(sequence => ({ method: "POST", path: "/matches/sequence", body: { sequence } })),
  ])("rejects invalid input before upstream access: %j", async (request) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(api(request)).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains a single-lookup 404 as an error rather than an empty biological result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Not found" }, { status: 404 })));
    await expect(api({ method: "GET", path: `/matches/${"0".repeat(32)}` })).rejects.toThrow("HTTP 404");
  });

  it("retains existing record routing, query parameters and observed release headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [] }, { headers: { "interpro-version": "110.0" } })); vi.stubGlobal("fetch", fetchMock);
    expect((await api({ method: "GET", path: "/entry/interpro", params: { search: "kinase" } })).data).toMatchObject({ _meta: { interpro_version: "110.0" } });
    expect(fetchMock).toHaveBeenCalledWith("https://www.ebi.ac.uk/interpro/api/entry/interpro/?search=kinase", expect.anything());
    await expect(api({ method: "POST", path: "/entry/interpro" })).rejects.toThrow("GET only");
  });
});
