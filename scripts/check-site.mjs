#!/usr/bin/env node
// Verify the pages maintained in this repository before publishing.
// Independent project deployments and external URLs require separate live checks.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findUnsafeNewTabLinks } from "./html-links.mjs";
import { discoverPages, validateSitemap } from "./site-inventory.mjs";
import { checkLocalReference } from "./local-references.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = discoverPages(root);
const featuredPages = new Set(["index.html", "case-studies/campus-one/index.html", "case-studies/contractscope/index.html", "case-studies/relaylab/index.html"]);
const siblingPages = new Set([
  "foldpress", "relaylab", "contractscope", "motionbench", "switchback",
  "roomtone", "stillroom", "cuework", "tracefold", "patchday",
]);
const failures = [];
const counts = { local: 0, external: 0, sibling: 0, error: 0 };

function report(file, issue) {
  failures.push(`${file}: ${issue}`);
}

function validatePage(file) {
  const pagePath = join(root, file);
  if (!existsSync(pagePath)) {
    report(file, "page not found");
    return;
  }
  const html = readFileSync(pagePath, "utf8");
  if (!/<html\b[^>]*lang=["'](?:zh-Hant|en)["']/i.test(html)) report(file, "missing supported document language");
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) report(file, "expected exactly one h1");
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) report(file, "missing meta description");
  if (!/<title>[^<]+<\/title>/i.test(html)) report(file, "missing document title");

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']+["']/i.test(match[0])) report(file, "image without descriptive alt text");
  }
  for (const tag of findUnsafeNewTabLinks(html)) report(file, "new-tab link missing rel=noopener");

  const allIds = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (new Set(allIds).size !== allIds.length) report(file, "duplicate id attributes");

  const canonical = `https://miiduoa.github.io/${file === "index.html" ? "" : file.replace(/index\.html$/, "")}`;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) report(file, "missing or incorrect canonical URL");
  if (featuredPages.has(file)) {
    for (const property of ["og:title", "og:description", "og:image", "og:image:alt", "og:url"]) {
      if (!html.includes(`property="${property}"`)) report(file, `missing social preview metadata: ${property}`);
    }
  }

  for (const [, attribute, target] of html.matchAll(/\b(href|src)=["']([^"']*)["']/gi)) {
    const result = checkLocalReference(target, { root, page: file, siblingPages, attribute });
    counts[result.kind]++;
    if (result.kind === "error") report(file, result.issue);
  }
}

for (const page of pages) validatePage(page);

const robotsFile = join(root, "robots.txt");
const sitemapFile = join(root, "sitemap.xml");
if (!existsSync(robotsFile) || !existsSync(sitemapFile)) {
  report("crawl", "robots.txt and sitemap.xml must exist");
} else {
  const robots = readFileSync(robotsFile, "utf8");
  const sitemap = readFileSync(sitemapFile, "utf8");
  if (!robots.includes("Sitemap: https://miiduoa.github.io/sitemap.xml")) report("robots.txt", "missing sitemap reference");
  for (const issue of validateSitemap(sitemap, pages)) report("sitemap.xml", issue);
}

console.log(`References: ${counts.local} local checked; ${counts.sibling} independent project links and ${counts.external} external references not live-checked.`);
if (failures.length) {
  console.error(`Portfolio verification failed (${failures.length}):\n${failures.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Portfolio verification passed: ${pages.length} pages, ${counts.local} local references checked.`);
}
