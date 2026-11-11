# interpro-mcp-server

MCP server for the EBI InterPro REST API — protein families, domains, and functional sites from 13 member databases (Pfam, SMART, PRINTS, PROSITE, CDD, NCBIfam, PANTHER, CATH-Gene3D, SUPERFAMILY, HAMAP, PIRSF, SFLD, AntFam).

- Upstream API: https://www.ebi.ac.uk/interpro/api
- Upstream docs: https://github.com/ProteinsWebTeam/interpro7-api
- Auth: none
- Response format: JSON (adapter sends `Accept: application/json`)
- Version surfacing: `interpro-version` response header is attached as `_meta.interpro_version` on object responses

## Tools (Code Mode only)

- `interpro_search` — discover record and sequence-match endpoints from the curated catalog
- `interpro_execute` — run sandboxed JavaScript with `api.get()` and Matches `api.post()`
- `interpro_query_data` — SQL over staged responses
- `interpro_get_schema` — inspect staged-dataset schemas

All four tools also register their `mcp_interpro_*` aliases. Code Mode uses the
existing V8 isolate and API proxy. Complete tool responses, including composed
matches and SQL/schema results, are measured in UTF-8 bytes and staged above
the shared 30 KiB threshold. `_staging` and `data_access_id` identify the
recoverable result in the existing Durable Object. When the final envelope is
staged, its `payloads` table retains the entire response, including native
evidence and the original citation; the outer citation hashes that complete
envelope. Missing or failed storage produces an MCP error rather than a
successful response with discarded data.

October 3 native/local acceptance passes both aliases, single/batch/sequence
lookups, native misses and errors, and record pagination with release 110.0.
A six-checksum batch recovers all 152 matches through staging and SQL; a record
page retains all 100 entries. Small SQL/schema results also carry verifiable
citations. Native error bodies are retained. Response bodies have an 8 MiB limit
and a 30-second read budget; oversized or stalled responses fail explicitly.

Record pages and cached matches carry conservative coverage metadata, including
when returned inside composed evidence. A page count is not proof of complete
query coverage. Repeated MD5 inputs collapse upstream; use returned checksums to
associate results. The Matches schema version 0.6.0 is an API version, not a
biological dataset release. In the insulin sample, Pfam signatures use 38.2 while
InterPro-N Pfam predictions use 37.3; these remain separate.

## Example (Code Mode)

```js
// Find the InterPro entry for kinase domain
const hits = await api.get('/entry/all/', { search: 'kinase domain', page_size: 10 });
return hits.results.slice(0, 5).map(r => ({
  accession: r.metadata.accession,
  name: r.metadata.name,
  type: r.metadata.type,
}));
```

## Sequence lookup before compute

The [Matches API](https://www.ebi.ac.uk/interpro/matches/api/) provides precomputed InterProScan results by sequence MD5. `POST /matches` accepts 1–100 checksums; `GET /matches/{md5}` retrieves one. The local `POST /matches/sequence` helper accepts one plain protein or single-record FASTA, removes whitespace, uppercases amino acids, computes the provider's MD5 identifier, and performs the batch lookup. It rejects gaps, stop symbols, multiple records and input above 100,000 characters.

```js
const lookup = await api.post('/matches', {
  md5: ['116E31DDA297A0F45F6E1025E722D62B']
});
return lookup; // results[].found and matches retain all provider evidence
```

Batch `found:false` identifies a cache miss; a single GET miss returns HTTP 404. Missing matches do not establish absence of function. Keep `source: "InterPro-N"` neural predictions separate from member-database signature matches and curated `signature.entry` annotations. Preserve library versions, coordinates and scores. The observed Matches responses do not expose an overall InterPro release; the adapter does not invent one.

For a missing sequence, discover current `iprscan6` parameters with `ebi_tools_execute`, then submit once and retain the job ID for bounded polling and output retrieval. The public Dispatcher currently also supports `iprscan5`; application identifiers differ. Running the full InterProScan 6 Nextflow pipeline locally requires external compute.

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from InterPro and stays under the terms of that source: CC0.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->
