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
 * NOT support OR groups). Policy:
 * - recently pushed (active work) + created within ~9 months = EARLY STAGE,
 *   which is the real gate for a pre-seed fund.
 * - stars:>=2 is only a substance floor against empty/junk repos. NO ceiling:
 *   real work WITH traction is the best case and must not be excluded.
 *   Hype-without-work is filtered by SCORING (evidence density), never by
 *   search — and stars never inflate capability (see rank.ts, prompts.ts).
 */
export function buildKeywordQuery(keyword: string): string {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  return `topic:${keyword} created:>=${daysAgo(270)} pushed:>=${daysAgo(21)} stars:>=2 archived:false`;
}
