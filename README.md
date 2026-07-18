# interpro-mcp-server

MCP server for the EBI InterPro REST API — protein families, domains, and functional sites from 13 member databases (Pfam, SMART, PRINTS, PROSITE, CDD, NCBIfam, PANTHER, CATH-Gene3D, SUPERFAMILY, HAMAP, PIRSF, SFLD, AntFam).

- Upstream API: https://www.ebi.ac.uk/interpro/api
- Upstream docs: https://github.com/ProteinsWebTeam/interpro7-api
- Auth: none
- Response format: JSON (adapter sends `Accept: application/json`)
- Version surfacing: `interpro-version` response header is attached as `_meta.interpro_version` on object responses

## Tools (Code Mode only)

- `interpro_search` — discover endpoints from the curated catalog (14 endpoints across `entry`, `protein`, `structure`, `taxonomy`, `proteome`, `set`, `search` categories)
- `interpro_execute` — run sandboxed JavaScript against the InterPro API via `api.get()`
- `interpro_query_data` — SQL over staged responses
- `interpro_get_schema` — inspect staged-dataset schemas

## Example (Code Mode)

```js
// Find the InterPro entry for kinase domain
const hits = await api.get('/search/text/{query}/', { query: 'kinase domain', page_size: 10 });
return hits.results.slice(0, 5).map(r => ({
  accession: r.metadata.accession,
  name: r.metadata.name,
  type: r.metadata.type,
}));
```
