import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { interproFetch } from "./http";

/**
 * Normalize an InterPro API path to always end with a trailing slash
 * for non-query paths. InterPro's DRF routes require the trailing slash
 * (a request without one returns 301 and then 404 inside Workers fetch).
 *
 * If the path already contains a query string we split, normalize the
 * path portion, and reattach.
 */
function withTrailingSlash(rawPath: string): string {
    // Leave absolute URLs alone (shouldn't happen via Code Mode, but defensive).
    if (/^https?:\/\//i.test(rawPath)) return rawPath;

    const qIndex = rawPath.indexOf("?");
    const path = qIndex >= 0 ? rawPath.slice(0, qIndex) : rawPath;
    const query = qIndex >= 0 ? rawPath.slice(qIndex) : "";

    if (!path) return rawPath;
    if (path.endsWith("/")) return rawPath;
    return `${path}/${query}`;
}

/**
 * Attach interpro-version (response header) into the data envelope so that
 * Code Mode consumers can see which InterPro release produced the response.
 *
 * Only applied when `data` is a non-array plain object — InterPro responses
 * are overwhelmingly object-shaped ({ metadata, results, count, ... }). When
 * the response is an array or string, we leave the shape untouched to avoid
 * surprising callers.
 */
function attachInterproVersion(data: unknown, version: string | null): unknown {
    if (!version) return data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;

    const existing = (data as Record<string, unknown>)._meta;
    const meta =
        existing && typeof existing === "object" && !Array.isArray(existing)
            ? { ...(existing as Record<string, unknown>), interpro_version: version }
            : { interpro_version: version };

    return { ...(data as Record<string, unknown>), _meta: meta };
}

export function createInterproApiFetch(): ApiFetchFn {
    return async (request) => {
        const path = withTrailingSlash(request.path);

        const response = await interproFetch(path, request.params);

        if (!response.ok) {
            let errorBody: string;
            try {
                errorBody = await response.text();
            } catch {
                errorBody = response.statusText;
            }
            const error = new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`) as Error & {
                status: number;
                data: unknown;
            };
            error.status = response.status;
            error.data = errorBody;
            throw error;
        }

        const interproVersion = response.headers.get("interpro-version");

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
            const text = await response.text();
            return {
                status: response.status,
                data: attachInterproVersion({ text }, interproVersion),
            };
        }

        const data = await response.json();
        return {
            status: response.status,
            data: attachInterproVersion(data, interproVersion),
        };
    };
}
