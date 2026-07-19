// Sector-to-GitHub search keyword mapping. Each thesis sector maps to an array
// of search terms used to query the GitHub Search API for relevant repositories.

export const SECTOR_KEYWORDS: Record<string, string[]> = {
  "Developer tools": ["cli", "devtools", "developer-tools", "ide", "code-editor"],
  "AI infra": ["llm", "inference", "vector-database", "ai-infrastructure", "ml-ops"],
  "Vertical SaaS": ["saas", "vertical-saaS", "b2b", "enterprise"],
  "Fintech infra": ["fintech", "banking-api", "payment-processing", "ledger"],
  "Healthtech": ["healthtech", "medical-ai", "health-data"],
  "Climate tech": ["climate-tech", "carbon", "sustainability", "green-ai"],
  "Consumer": ["consumer", "social", "mobile-app"],
};

/** Build a GitHub search query string for a given sector. */
export function buildSectorQuery(sector: string): string | null {
  const keywords = SECTOR_KEYWORDS[sector];
  if (!keywords || keywords.length === 0) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const keywordClause = keywords.map((k) => `"${k}"`).join(" OR ");

  return `(${keywordClause}) created:>=${thirtyDaysAgo} stars:>=50`;
}
