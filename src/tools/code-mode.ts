import type { McpServer } from "@bio-mcp/shared/mcp";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { interproCatalog } from "../spec/catalog";
import { createInterproApiFetch } from "../lib/api-adapter";
import { interproResponse } from "../lib/tool-result";

interface CodeModeEnv {
    INTERPRO_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createInterproApiFetch();
    const registrar = { tool: (...args: unknown[]) => {
        const [name, ...rest] = args;
        const handler = rest.pop() as (input: unknown, extra: unknown) => ReturnType<typeof interproResponse>;
        const respond = (input: unknown, extra: unknown) => interproResponse(() => handler(input, extra), env, String(name), extra, input);
        const register = server.tool.bind(server) as (...values: unknown[]) => void;
        register(name, ...rest, respond);
        register(`mcp_${String(name)}`, ...rest, respond);
    } };

    const searchTool = createSearchTool({
        prefix: "interpro",
        catalog: interproCatalog,
    });
    searchTool.register(registrar);

    const executeTool = createExecuteTool({
        prefix: "interpro",
        // Verifiable provenance: interpro_execute results carry a _meta.citation.
        source: { id: "interpro", name: "InterPro", url: "https://www.ebi.ac.uk/interpro", license: "CC0 1.0" },
        catalog: interproCatalog,
        apiFetch,
        maxInlineBytes: 30 * 1024,
        stagingThreshold: 30 * 1024,
        preserveApiErrors: true,
        timeout: 45_000,
        doNamespace: env.INTERPRO_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(registrar);
}
