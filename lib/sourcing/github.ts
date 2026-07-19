// GitHub scanner: searches for promising founders by querying repositories
// created in the last 30 days that match the thesis sectors.

import { buildSectorQuery } from "./keywords";
import { intakeOutboundFounder } from "./intake";

const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    type: string;
  };
}

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  blog: string | null;
  location: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
  avatar_url: string;
}

interface ScanResult {
  founderId: string;
  opportunityId: string;
  knownFounder: boolean;
  login: string;
  name: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Argus-VC-Scanner/1.0",
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function githubFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: headers() });
    if (res.status === 403 || res.status === 429) {
      console.warn(`[github] rate limited (${res.status}) on ${url}`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[github] ${res.status} on ${url}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[github] fetch error on ${url}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Search repos for a sector, return unique owner logins with repo metadata. */
async function searchReposForSector(sector: string): Promise<Map<string, GitHubRepo>> {
  const query = buildSectorQuery(sector);
  if (!query) return new Map();

  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
  const data = await githubFetch<{ items: GitHubRepo[] }>(url);
  if (!data?.items) return new Map();

  // Deduplicate by owner login (keep highest-starred repo per owner).
  const byOwner = new Map<string, GitHubRepo>();
  for (const repo of data.items) {
    if (repo.owner.type !== "User") continue;
    const existing = byOwner.get(repo.owner.login);
    if (!existing || repo.stargazers_count > existing.stargazers_count) {
      byOwner.set(repo.owner.login, repo);
    }
  }
  return byOwner;
}

/** Fetch a GitHub user profile. */
async function fetchUser(login: string): Promise<GitHubUser | null> {
  return githubFetch<GitHubUser>(`${GITHUB_API}/users/${login}`);
}

/** Build the raw content string that gets ingested as a Signal. */
function buildRawContent(repo: GitHubRepo, user: GitHubUser): string {
  const parts = [
    `GitHub user: ${user.name || user.login} (${user.login})`,
    user.bio ? `Bio: ${user.bio}` : null,
    user.location ? `Location: ${user.location}` : null,
    `Followers: ${user.followers}`,
    `Public repos: ${user.public_repos}`,
    "",
    `Top repository: ${repo.name}`,
    repo.description ? `Description: ${repo.description}` : null,
    `Stars: ${repo.stargazers_count}, Forks: ${repo.forks_count}`,
    repo.language ? `Language: ${repo.language}` : null,
    repo.topics.length > 0 ? `Topics: ${repo.topics.join(", ")}` : null,
    `Created: ${repo.created_at}`,
    `URL: ${repo.html_url}`,
  ].filter(Boolean);

  return parts.join("\n");
}

/**
 * Scan GitHub for promising founders matching the thesis sectors.
 * Returns discovered founders with their intake results.
 */
export async function scanGitHub(sectors: string[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const seenLogins = new Set<string>();

  for (const sector of sectors) {
    const owners = await searchReposForSector(sector);

    for (const [login, repo] of owners) {
      if (seenLogins.has(login)) continue;
      seenLogins.add(login);

      // Respect rate limits: wait between user fetches.
      await sleep(TOKEN ? 200 : 700);

      const user = await fetchUser(login);
      if (!user) continue;

      const rawContent = buildRawContent(repo, user);
      if (rawContent.length < 30) continue;

      try {
        const intake = await intakeOutboundFounder({
          founderName: user.name || user.login,
          companyName: null,
          source: "GITHUB",
          handle: user.login,
          sourceUrl: user.avatar_url,
          rawContent,
          occurredAt: new Date(repo.created_at),
          meta: {
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: repo.topics,
            followers: user.followers,
            sector,
          },
          context: {
            location: user.location ?? undefined,
          },
        });

        results.push({
          ...intake,
          login: user.login,
          name: user.name || user.login,
        });
      } catch (err) {
        console.warn(`[github] intake failed for ${login}:`, err);
      }
    }
  }

  return results;
}
