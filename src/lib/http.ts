import { restFetch } from "@bio-mcp/shared/http/rest-fetch";
import type { RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const INTERPRO_BASE = "https://www.ebi.ac.uk/interpro/api";

export interface InterproFetchOptions extends Omit<RestFetchOptions, "retryOn"> {
    baseUrl?: string;
}

/**
 * Fetch from the EBI InterPro API.
 * No auth required. Returns JSON when `Accept: application/json` is sent.
 */
export async function interproFetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: InterproFetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? INTERPRO_BASE;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, params, {
        ...opts,
        headers,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "interpro-mcp-server/1.0 (bio-mcp)",
    });
}
