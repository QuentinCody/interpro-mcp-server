import type { ApiEndpoint } from "@bio-mcp/shared/codemode/catalog";

export const matchesNotes =
  "- /matches routes use the separate InterPro Matches API, with no trailing-slash redirect. Query cached sequence matches before submitting compute.\n" +
  "- Batch lookup collapses repeated MD5s upstream; retain returned checksum identities instead of assuming one result per input. Cached matches do not establish which analyses ran.\n" +
  "- POST batch results include found: false for absent sequences; GET returns HTTP 404. A cache miss or empty matches is not evidence that a protein lacks function.\n" +
  "- Preserve match.source, signature.signatureLibraryRelease, locations and scores. source='InterPro-N' denotes neural predictions; do not merge these with member-database signature evidence or curated InterPro entries.\n" +
  "- The Matches API does not return an InterPro release header in observed responses. Per-signature library versions are retained; no overall release is inferred from catalog metadata.\n" +
  "- Missing sequences or analyses can be sent to EBI Job Dispatcher after discovering its current application list; full InterProScan 6 Nextflow workflows require external compute.\n";

export const matchesEndpoints: ApiEndpoint[] = [
  {
    method: "GET", path: "/matches/{md5}", category: "sequence matches",
    summary: "Retrieve precomputed InterProScan matches for a protein sequence MD5 checksum.",
    pathParams: [{ name: "md5", type: "string", required: true, description: "32 hexadecimal digits identifying the exact protein sequence" }],
    example: "return await api.get('/matches/116E31DDA297A0F45F6E1025E722D62B');",
  },
  {
    method: "POST", path: "/matches", category: "sequence matches",
    summary: "Batch lookup before compute: found flags, signature matches and separate InterPro-N predictions for 1–100 sequence MD5s.",
    body: { contentType: "application/json", description: "{md5: string[]}; 1–100 checksums; preserves results[].md5, found and matches" },
    example: "return await api.post('/matches', {md5:['116E31DDA297A0F45F6E1025E722D62B','00000000000000000000000000000000']});",
  },
  {
    method: "POST", path: "/matches/sequence", category: "sequence matches",
    summary: "Local helper: normalize one protein sequence, compute its MD5 and query precomputed matches without submitting a compute job.",
    body: { contentType: "application/json", description: "{sequence: string}; plain amino acids or one FASTA record, maximum 100,000 input characters. Removes whitespace and uppercases; rejects gaps, stop symbols and multiple records. Returns the upstream batch envelope." },
  },
];
