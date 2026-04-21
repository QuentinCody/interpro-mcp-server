import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

/**
 * InterPro REST API catalog.
 *
 * The InterPro API is the EBI's protein-family, domain, and functional-site
 * lookup. It unifies ~13 member databases (Pfam, SMART, PRINTS, PROSITE, CDD,
 * NCBIfam, PANTHER, CATH-Gene3D, SUPERFAMILY, HAMAP, PIRSF, SFLD, AntFam) into
 * a single set of cross-referenced accessions and maps each to UniProt
 * proteins, PDB structures, NCBI taxa, and UniProt reference proteomes.
 *
 * Catalog endpoints below cover the seven documented categories of the API:
 *   entry, protein, structure, taxonomy, proteome, set, search.
 *
 * All paths must end with a trailing slash — InterPro's DRF URL router
 * 301-redirects paths without it, which Workers fetch does not follow
 * transparently. `api-adapter.ts` normalizes this automatically.
 *
 * NOTE: InterPro does not expose a dedicated `/search/` endpoint. Full-text
 * search is available as a `search` query param on the listing endpoints
 * (e.g., `/entry/all/?search=kinase`). The `search` category below groups
 * these search-capable list endpoints together for discovery.
 */
export const interproCatalog: ApiCatalog = {
    name: "InterPro",
    baseUrl: "https://www.ebi.ac.uk/interpro/api",
    version: "108.0",
    auth: "none",
    endpointCount: 14,
    notes:
        "- InterPro unifies ~13 member DBs (Pfam, SMART, PRINTS, PROSITE, CDD, NCBIfam, PANTHER, CATH-Gene3D, SUPERFAMILY, HAMAP, PIRSF, SFLD, AntFam) into one cross-referenced index.\n" +
        "- `{db}` placeholders accept any of these lowercase member-database codes: interpro, pfam, smart, prints, prosite, cdd, ncbifam, panther, cathgene3d, ssf, hamap, pirsf, profile, sfld, antfam. Use `all` to span every member DB.\n" +
        "- ALL paths require a trailing slash — requesting `/entry/interpro` (without the final `/`) returns 301 then 404. The api-adapter normalizes this for you.\n" +
        "- Paginate via `?page_size=200` (max 200) plus cursor-based `?cursor=...` via the `next` field returned in responses. Default to `page_size=200` for list endpoints to minimize round-trips.\n" +
        "- Full-text search: append `?search=<term>` to any list endpoint (e.g., `/entry/all/?search=kinase%20domain` matches across all member DBs — canonical way to search).\n" +
        "- Responses include an `interpro-version` HTTP response header — the adapter surfaces this as `_meta.interpro_version` on object responses.\n" +
        "- Accession patterns: InterPro entries are `IPR\\d{6}`, Pfam are `PF\\d{5}`, PROSITE are `PS\\d{5}`, PANTHER are `PTHR\\d{5}`, CDD are `cd\\d{5}`, etc. Use `/utils/accession/{id}/` to resolve any accession to its owning endpoint.\n" +
        "- UniProt accessions in `/protein/uniprot/{id}/` must be canonical (no isoform suffix).\n" +
        "- Response bodies are always JSON when `Accept: application/json` is sent (the adapter does this).",
    endpoints: [
        // ── entry ─────────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/entry/interpro/",
            summary: "List all InterPro (IPR) entries — paginated",
            category: "entry",
            queryParams: [
                { name: "page_size", type: "number", required: false, description: "Max 200 (default 20)" },
                { name: "cursor", type: "string", required: false, description: "Pagination cursor — read from `next` URL of previous response" },
                { name: "type", type: "string", required: false, description: "Filter by entry type", enum: ["family", "domain", "repeat", "homologous_superfamily", "active_site", "binding_site", "conserved_site", "ptm"] },
                { name: "search", type: "string", required: false, description: "Full-text filter (matches name, description, GO terms)" },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/entry/interpro/{ipr_id}/",
            summary: "Detail for one InterPro accession (e.g. IPR000001)",
            category: "entry",
            pathParams: [
                { name: "ipr_id", type: "string", required: true, description: "InterPro accession (e.g. IPR000001)" },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/entry/pfam/{pfam_id}/",
            summary: "Detail for one Pfam protein-family or domain accession (e.g. PF00001)",
            category: "entry",
            pathParams: [
                { name: "pfam_id", type: "string", required: true, description: "Pfam accession (e.g. PF00001 — protein kinase domain families use PF00069 family)" },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/entry/{db}/",
            summary: "List entries for one member database (pfam, smart, prints, prosite, cdd, ncbifam, panther, cathgene3d, ssf, hamap, pirsf, profile, sfld, antfam). Use db=all to span every database.",
            category: "entry",
            pathParams: [
                { name: "db", type: "string", required: true, description: "Member database code (or 'all' to span every DB)", enum: ["all", "interpro", "pfam", "smart", "prints", "prosite", "cdd", "ncbifam", "panther", "cathgene3d", "ssf", "hamap", "pirsf", "profile", "sfld", "antfam"] },
            ],
            queryParams: [
                { name: "page_size", type: "number", required: false, description: "Max 200" },
                { name: "cursor", type: "string", required: false, description: "Pagination cursor" },
                { name: "search", type: "string", required: false, description: "Full-text filter" },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/entry/interpro/protein/uniprot/{uniprot_id}/",
            summary: "All InterPro entries that hit a given UniProt protein (domain architecture)",
            category: "entry",
            pathParams: [
                { name: "uniprot_id", type: "string", required: true, description: "Canonical UniProt accession (e.g. P04637)" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── protein ───────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/protein/uniprot/{uniprot_id}/",
            summary: "Protein record (UniProt metadata + all member-DB signature matches, including domain and kinase family annotations)",
            category: "protein",
            pathParams: [
                { name: "uniprot_id", type: "string", required: true, description: "Canonical UniProt accession (e.g. P04637 for p53, or a kinase UniProt like P00533 EGFR)" },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/protein/uniprot/{uniprot_id}/entry/interpro/",
            summary: "All InterPro entries (domains, families, active sites) hitting a protein — inverse direction of /entry/.../protein/...",
            category: "protein",
            pathParams: [
                { name: "uniprot_id", type: "string", required: true, description: "Canonical UniProt accession (e.g. a kinase like P00533)" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── structure ─────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/structure/pdb/{pdb_id}/",
            summary: "Domains and entries mapped to a PDB structure",
            category: "structure",
            pathParams: [
                { name: "pdb_id", type: "string", required: true, description: "4-letter PDB ID (lowercase, e.g. 1tup)" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── taxonomy ──────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/taxonomy/uniprot/{taxon_id}/",
            summary: "Entries relevant to a given NCBI taxon (e.g. 9606 for Homo sapiens)",
            category: "taxonomy",
            pathParams: [
                { name: "taxon_id", type: "string", required: true, description: "NCBI taxon ID" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── proteome ──────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/proteome/uniprot/{proteome_id}/",
            summary: "Entries in a UniProt reference proteome (e.g. UP000005640)",
            category: "proteome",
            pathParams: [
                { name: "proteome_id", type: "string", required: true, description: "UniProt reference proteome ID (e.g. UP000005640)" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── set ───────────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/set/",
            summary: "Count of entry sets/clans per member DB (e.g. {pfam: 812, cdd: 1246, pirsf: 44})",
            category: "set",
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/set/{db}/",
            summary: "Entry sets / clans for a member DB (Pfam clans, PIRSF sets, CDD clusters). db in {pfam, cdd, pirsf}.",
            category: "set",
            pathParams: [
                { name: "db", type: "string", required: true, description: "Member DB code with sets/clans", enum: ["pfam", "cdd", "pirsf"] },
            ],
            queryParams: [
                { name: "page_size", type: "number", required: false, description: "Max 200" },
                { name: "cursor", type: "string", required: false, description: "Pagination cursor" },
            ],
            coveredByTool: "interpro_search",
        },
        // ── search ────────────────────────────────────────────────────────
        {
            method: "GET",
            path: "/entry/all/",
            summary: "Full-text search across all member DBs — primary search endpoint. Use `search=<term>` query param (e.g. kinase domain, zinc finger, Rossmann fold).",
            category: "search",
            queryParams: [
                { name: "search", type: "string", required: true, description: "Free-text query (URL-encode spaces). Matches entry names, descriptions, GO terms." },
                { name: "page_size", type: "number", required: false, description: "Max 200 (default 20)" },
                { name: "cursor", type: "string", required: false, description: "Pagination cursor from previous response's `next`" },
                { name: "type", type: "string", required: false, description: "Filter by entry type", enum: ["family", "domain", "repeat", "homologous_superfamily", "active_site", "binding_site", "conserved_site", "ptm"] },
            ],
            coveredByTool: "interpro_search",
        },
        {
            method: "GET",
            path: "/utils/accession/{accession}/",
            summary: "Resolve any accession (IPR/PF/PS/PTHR/cd/etc.) to its owning endpoint and source database — useful when you receive an unknown accession and need to route to the right /entry/{db}/ lookup.",
            category: "search",
            pathParams: [
                { name: "accession", type: "string", required: true, description: "Any InterPro-compatible accession (e.g. IPR000023, PF00365, cd00012)" },
            ],
            coveredByTool: "interpro_search",
        },
    ],
};
