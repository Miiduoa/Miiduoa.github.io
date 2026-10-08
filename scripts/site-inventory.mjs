import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const SITE_ORIGIN = "https://miiduoa.github.io";

const publishedGroups = ["case-studies", "labs", "tools"];

export function discoverPages(root) {
  const pages = ["index.html"];
  for (const group of publishedGroups) {
    const base = join(root, group);
    if (!existsSync(base)) throw new Error("missing site directory: " + group);
    function visit(folder, relative) {
      const entries = readdirSync(folder, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name, "en"));
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const directory = join(folder, entry.name);
        const path = relative + "/" + entry.name;
        if (existsSync(join(directory, "index.html"))) pages.push(path + "/index.html");
        visit(directory, path);
      }
    }
    visit(base, group);
  }
  return pages;
}

export function pageUrl(file) {
  return SITE_ORIGIN + (file === "index.html" ? "/" : "/" + file.replace(/index\.html$/, ""));
}

export function validateSitemap(xml, pages) {
  const urls = [...xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map(match => match[1]);
  const expected = new Set(pages.map(pageUrl));
  const issues = [];
  const seen = new Set();

  for (const url of urls) {
    if (seen.has(url)) issues.push("duplicate sitemap URL: " + url);
    seen.add(url);
    if (!expected.has(url)) issues.push("unrecognized sitemap URL: " + url);
  }
  for (const url of expected) {
    if (!seen.has(url)) issues.push("missing published page: " + url);
  }
  return issues;
}
