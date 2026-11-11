/// <reference types="node" />
import { createHash } from "node:crypto";
import { z } from "zod";
import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { interproFetch } from "./http";

const MATCHES_BASE = "https://www.ebi.ac.uk/interpro/matches/api";
const md5 = z.string().regex(/^[0-9a-f]{32}$/i);
const batch = z.object({ md5: z.array(md5).min(1).max(100) });
const sequenceInput = z.object({ sequence: z.string().min(1).max(100_000) });

/** A checksum lookup requires one exact protein sequence, not a multi-FASTA file. */
function sequenceMd5(body: unknown): string {
  const input = sequenceInput.parse(body).sequence.trim();
  const withoutHeader = input.startsWith(">") ? input.slice(input.indexOf("\n") + 1) : input;
  const sequence = withoutHeader.replace(/\s/g, "").toUpperCase();
  if (!/^[ACDEFGHIKLMNPQRSTVWYBXZJUO]+$/.test(sequence)) {
    throw new Error("Provide one protein sequence or single-record FASTA; gaps, stops and multiple records are not accepted");
  }
  // MD5 is the provider's sequence identifier, not a security or provenance hash.
  return createHash("md5").update(sequence).digest("hex").toUpperCase();
}

export async function fetchMatches(request: Parameters<ApiFetchFn>[0]): Promise<Response> {
  const path = request.path.replace(/\/$/, "");
  if (request.method === "GET" && path.startsWith("/matches/")) {
    const checksum = md5.parse(path.slice("/matches/".length));
    return interproFetch(`/matches/${checksum}`, undefined, { baseUrl: MATCHES_BASE });
  }
  if (request.method !== "POST" || !["/matches", "/matches/sequence"].includes(path)) {
    throw new Error("Use GET /matches/{md5}, POST /matches, or POST /matches/sequence");
  }
  const body = path === "/matches/sequence"
    ? { md5: [sequenceMd5(request.body)] }
    : batch.parse(request.body);
  return interproFetch("/matches", undefined, { baseUrl: MATCHES_BASE, method: "POST", body });
}
