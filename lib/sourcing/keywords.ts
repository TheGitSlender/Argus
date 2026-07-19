// Sector-to-GitHub search keyword mapping. Keys are normalized slugs; use
// buildSectorQuery with any casing ("AI infra", "ai-infra") — it normalizes.

export const SECTOR_KEYWORDS: Record<string, string[]> = {
  "devtools": ["cli", "devtools", "developer-tools", "lsp", "build-tool"],
  "developer-tools": ["cli", "devtools", "developer-tools", "lsp", "build-tool"],
  "ai-infra": ["llm", "inference", "vector-database", "ai-infrastructure", "mlops"],
  "applied-ai": ["computer-vision", "nlp", "ai-agent", "machine-learning", "rag"],
  "vertical-saas": ["saas", "b2b", "erp", "workflow-automation"],
  "fintech-infra": ["fintech", "banking-api", "payments", "ledger"],
  "healthtech": ["healthtech", "medical-imaging", "health-data", "clinical"],
  "climate-tech": ["climate", "carbon", "energy-monitoring", "sustainability"],
  "consumer": ["social-app", "mobile-app", "consumer"],
};

function normalizeSector(sector: string): string {
  return sector.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function sectorKeywords(sector: string): string[] {
  return SECTOR_KEYWORDS[normalizeSector(sector)] ?? [];
}

/**
 * Build one GitHub repo-search query per topic keyword (repository search does
 * NOT support OR groups), tuned for HIDDEN GEMS:
 * - recently pushed (active work), created within ~9 months (early-stage)
 * - stars 3..40: enough substance to filter empty repos, but explicitly UNDER
 *   the radar — we exclude already-visible projects instead of chasing them.
 *   (Ranking by stars would rebuild the network-gated system; see rank.ts.)
 */
export function buildKeywordQuery(keyword: string): string {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  return `topic:${keyword} created:>=${daysAgo(270)} pushed:>=${daysAgo(21)} stars:3..40 archived:false`;
}
