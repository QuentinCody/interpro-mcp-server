import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { interproCatalog } from "../spec/catalog";
import { createInterproApiFetch } from "../lib/api-adapter";

interface CodeModeEnv {
    INTERPRO_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createInterproApiFetch();

    const searchTool = createSearchTool({
        prefix: "interpro",
        catalog: interproCatalog,
    });
    searchTool.register(server as unknown as { tool: (...args: unknown[]) => void });

    const executeTool = createExecuteTool({
        prefix: "interpro",
        // Verifiable provenance: interpro_execute results carry a _meta.citation.
        source: { id: "interpro", name: "InterPro", url: "https://www.ebi.ac.uk/interpro", license: "CC0 1.0" },
        catalog: interproCatalog,
        apiFetch,
        doNamespace: env.INTERPRO_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(server as unknown as { tool: (...args: unknown[]) => void });
}
