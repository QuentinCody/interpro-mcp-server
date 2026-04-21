import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class InterproDataDO extends RestStagingDO {
    protected getSchemaHints(data: unknown): SchemaHints | undefined {
        if (!data || typeof data !== "object") return undefined;

        // InterPro paginated list responses: { count, next, previous, results: [...] }
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.results)) {
            const sample = (obj.results as unknown[])[0];
            if (sample && typeof sample === "object") {
                const sampleObj = sample as Record<string, unknown>;
                // Entry records have `metadata.accession` like "IPR000001" / "PF00001" / etc.
                if (sampleObj.metadata && typeof sampleObj.metadata === "object") {
                    return {
                        tableName: "entries",
                        indexes: ["accession", "source_database", "type"],
                    };
                }
            }
        }

        // Detail endpoint response: { metadata: {...}, ... }
        if (obj.metadata && typeof obj.metadata === "object") {
            const meta = obj.metadata as Record<string, unknown>;
            if (typeof meta.accession === "string") {
                // Identify by accession prefix
                const accession = String(meta.accession);
                if (accession.startsWith("IPR")) {
                    return { tableName: "interpro_entry", indexes: ["accession", "type"] };
                }
                if (accession.startsWith("PF")) {
                    return { tableName: "pfam_entry", indexes: ["accession"] };
                }
                return { tableName: "entry", indexes: ["accession", "source_database"] };
            }
            // Protein records
            if (typeof meta.name === "string" && typeof meta.length === "number") {
                return { tableName: "protein", indexes: ["accession", "name"] };
            }
        }

        return undefined;
    }
}
