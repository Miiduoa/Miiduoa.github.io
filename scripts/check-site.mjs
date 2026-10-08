#!/usr/bin/env node
// Verify the pages maintained in this repository before publishing.
// Project demos hosted by their own GitHub Pages repositories are checked
// in those projects' deployment pipelines, not treated as local files here.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "case-studies/campus-one/index.html"];
const siblingPages = new Set([
  "foldpress",
  "relaylab",
  "contractscope",
  "motionbench",
  "switchback",
  "roomtone",
  "stillroom",
  "cuework",
  "tracefold",
  "patchday",
]);
const failures = [];
let checked = 0;

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
  if (!/<html\b[^>]*lang=["']zh-Hant["']/i.test(html)) {
    report(file, "missing Traditional Chinese document language");
  }
  if ((html.match(/<h1\b/gi) ?? []).length !== 1) {
    report(file, "expected exactly one h1");
  }
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) {
    report(file, "missing meta description");
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    report(file, "missing document title");
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']+["']/i.test(match[0])) {
      report(file, "image without descriptive alt text");
    }
  }

  // Catch broken local references before publishing; external links are managed separately.
  for (const match of html.matchAll(/<a\\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    if (!/\\brel=["'][^"']*noopener[^"']*["']/i.test(match[0])) {
      report(file, "new-tab link missing rel=noopener");
    }
  }

  const allIds = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const ids = new Set(allIds);
  if (ids.size !== allIds.length) {
    report(file, "duplicate id attributes");
  }

  const canonical = `https://miiduoa.github.io/${file === "index.html" ? "" : file.replace(/index\.html$/, "")}`;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
    report(file, "missing or incorrect canonical URL");
  }
  for (const property of ["og:title", "og:description", "og:image", "og:image:alt", "og:url"]) {
    if (!html.includes(`property="${property}"`)) {
      report(file, `missing social preview metadata: ${property}`);
    }
  }

  for (const [, attribute, target] of html.matchAll(/\b(href|src)=["']([^"']+)["']/gi)) {
    if (/^(https?:|mailto:|tel:|data:)/i.test(target)) continue;
    if (target === "#" || target === "") {
      report(file, `${attribute} has an empty destination`);
      continue;
    }

    if (target.startsWith("#")) {
      if (!ids.has(decodeURIComponent(target.slice(1)))) {
        report(file, `missing anchor ${target}`);
      }
      checked++;
      continue;
    }

    const url = new URL(target, `https://miiduoa.github.io/${file}`);
    const parts = url.pathname.split("/").filter(Boolean);
    // These top-level paths belong to independent, deployed repositories.
    if (parts.length === 1 && siblingPages.has(parts[0]) && url.pathname.endsWith("/")) {
      continue;
    }

    const pathname = decodeURIComponent(url.pathname);
    const destination = resolve(root, `.${pathname}`);
    if (!destination.startsWith(root + "/") && destination !== root) {
      report(file, `link escapes repository: ${target}`);
      continue;
    }
    const destinationFile = pathname.endsWith("/") ? join(destination, "index.html") : destination;
    if (!existsSync(destinationFile)) {
      report(file, `missing local ${attribute} target: ${target}`);
    }
    checked++;
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
  if (!robots.includes("Sitemap: https://miiduoa.github.io/sitemap.xml")) {
    report("robots.txt", "missing sitemap reference");
  }
  for (const page of pages) {
    const url = `https://miiduoa.github.io/${page === "index.html" ? "" : page.replace(/index\.html$/, "")}`;
    if (!sitemap.includes(`<loc>${url}</loc>`)) {
      report("sitemap.xml", `missing published page: ${url}`);
    }
  }
}

if (failures.length) {
  console.error(`Portfolio verification failed (${failures.length}):\n${failures.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Portfolio verification passed: ${pages.length} pages, ${checked} local references checked.`);
}
