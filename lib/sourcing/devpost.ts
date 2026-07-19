// DevPost scanner: discovers hackathon projects and their creators by querying
// the DevPost JSON API for hackathon listings, then scraping individual
// project pages for team member details.

import * as cheerio from "cheerio";
import { intakeOutboundFounder } from "./intake";

const DEVPOST_API = "https://devpost.com/api/hackathons";
const USER_AGENT = "Argus-VC-Scanner/1.0";

interface DevpostHackathon {
  id: number;
  title: string;
  url: string;
  themes: Array<{ id: number; name: string }>;
  open_state: string;
  registrations_count: number;
}

interface DevpostProject {
  slug: string;
  name: string;
  description: string;
  technologies: string[];
  githubUrl: string | null;
  teamMembers: Array<{ name: string; profileUrl: string; bio: string | null }>;
  hackathonName: string | null;
}

interface ScanResult {
  founderId: string;
  opportunityId: string;
  knownFounder: boolean;
  devpostUsername: string;
  name: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      console.warn(`[devpost] ${res.status} on ${url}`);
      return null;
    }
    return res.text();
  } catch (err) {
    console.warn(`[devpost] fetch error on ${url}:`, err);
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[devpost] ${res.status} on ${url}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[devpost] fetch error on ${url}:`, err);
    return null;
  }
}

/** Fetch recent hackathon listings from the DevPost JSON API. */
async function fetchHackathons(page: number): Promise<DevpostHackathon[]> {
  const data = await fetchJson<{ hackathons: DevpostHackathon[] }>(
    `${DEVPOST_API}?page=${page}`,
  );
  return data?.hackathons ?? [];
}

/** Extract the subdomain from a DevPost hackathon URL. */
function subdomainFromUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/([^.]+)\.devpost\.com/);
  return match?.[1] ?? null;
}

/** Parse a DevPost project page for team and project details. */
function parseProjectPage(html: string): DevpostProject | null {
  const $ = cheerio.load(html);

  const name = $("#app-title").text().trim();
  if (!name) return null;

  const description = $("#app-description .large").first().text().trim()
    || $("meta[name='description']").attr("content")?.trim()
    || "";

  const technologies: string[] = [];
  $("#built-with .cp-tag").each((_, el) => {
    const tech = $(el).text().trim();
    if (tech) technologies.push(tech);
  });

  let githubUrl: string | null = null;
  $('[data-role="software-urls"] a').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.includes("github.com") && !githubUrl) {
      githubUrl = href;
    }
  });

  const teamMembers: DevpostProject["teamMembers"] = [];
  $("#app-team .software-team-member").each((_, el) => {
    const link = $(el).find(".user-profile-link").first();
    const memberName = link.text().trim();
    const profileHref = link.attr("href") ?? "";
    const bio = $(el).find("small").first().text().trim() || null;

    if (memberName && profileHref) {
      const fullUrl = profileHref.startsWith("http")
        ? profileHref
        : `https://devpost.com${profileHref}`;
      teamMembers.push({ name: memberName, profileUrl: fullUrl, bio });
    }
  });

  const hackathonName = $("#submissions .software-list-content a").first().text().trim() || null;

  return { slug: "", name, description, technologies, githubUrl, teamMembers, hackathonName };
}

/** Extract DevPost username from a profile URL. */
function usernameFromUrl(profileUrl: string): string | null {
  const match = profileUrl.match(/devpost\.com\/([^/?]+)/);
  return match?.[1] ?? null;
}

/**
 * Scan DevPost for hackathon projects matching the thesis.
 * Returns discovered founders with their intake results.
 */
export async function scanDevPost(sectors: string[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const seenUsernames = new Set<string>();

  // Fetch the first 3 pages of hackathons (~27 listings).
  const allHackathons: DevpostHackathon[] = [];
  for (let page = 1; page <= 3; page++) {
    const hackathons = await fetchHackathons(page);
    allHackathons.push(...hackathons);
    await sleep(500);
  }

  // Filter hackathons that match thesis sectors via their themes.
  const sectorLower = sectors.map((s) => s.toLowerCase());
  const matchedHackathons = allHackathons.filter((h) =>
    h.themes.some((t) => sectorLower.some((s) => t.name.toLowerCase().includes(s))),
  );

  // For each matched hackathon, try to find project pages.
  // Since the gallery is JS-rendered, we use a heuristic: fetch the
  // hackathon subdomain page and look for project links in the HTML.
  for (const hackathon of matchedHackathons.slice(0, 5)) {
    const subdomain = subdomainFromUrl(hackathon.url);
    if (!subdomain) continue;

    // Try fetching the project gallery page (may be JS-rendered).
    const galleryHtml = await fetchPage(`https://${subdomain}.devpost.com/project-gallery`);
    await sleep(500);

    if (!galleryHtml) continue;

    // Extract project slugs from the gallery HTML.
    const $ = cheerio.load(galleryHtml);
    const projectSlugs: string[] = [];
    $('a[href*="/software/"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const match = href.match(/\/software\/([^/?]+)/);
      if (match?.[1] && !projectSlugs.includes(match[1])) {
        projectSlugs.push(match[1]);
      }
    });

    // Fetch each project page for team details.
    for (const slug of projectSlugs.slice(0, 10)) {
      await sleep(500);
      const html = await fetchPage(`https://devpost.com/software/${slug}`);
      if (!html) continue;

      const project = parseProjectPage(html);
      if (!project) continue;

      for (const member of project.teamMembers) {
        const username = usernameFromUrl(member.profileUrl);
        if (!username || seenUsernames.has(username)) continue;
        seenUsernames.add(username);

        const rawContent = [
          `DevPost user: ${member.name} (${username})`,
          member.bio ? `Bio: ${member.bio}` : null,
          `Project: ${project.name}`,
          project.description ? `Description: ${project.description.slice(0, 300)}` : null,
          project.technologies.length > 0 ? `Technologies: ${project.technologies.join(", ")}` : null,
          project.githubUrl ? `GitHub: ${project.githubUrl}` : null,
          project.hackathonName ? `Hackathon: ${project.hackathonName}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        if (rawContent.length < 30) continue;

        try {
          const intake = await intakeOutboundFounder({
            founderName: member.name,
            companyName: null,
            source: "DEVPOST",
            handle: username,
            sourceUrl: member.profileUrl,
            rawContent,
            meta: {
              project: project.name,
              technologies: project.technologies,
              githubUrl: project.githubUrl,
              hackathon: project.hackathonName,
              registrations: hackathon.registrations_count,
            },
          });

          results.push({
            ...intake,
            devpostUsername: username,
            name: member.name,
          });
        } catch (err) {
          console.warn(`[devpost] intake failed for ${username}:`, err);
        }
      }
    }
  }

  return results;
}
