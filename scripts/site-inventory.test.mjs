import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverPages, pageUrl, validateSitemap } from "./site-inventory.mjs";

function fixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "portfolio-pages-"));
  try {
    for (const dir of ["labs", "tools", "case-studies"]) mkdirSync(join(root, dir));
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("new lab pages are included without modifying a manifest", () => fixture(root => {
  mkdirSync(join(root, "labs", "example"), { recursive: true });
  writeFileSync(join(root, "labs", "example", "index.html"), "<h1>Example</h1>");
  const pages = discoverPages(root);
  assert.deepEqual(pages, ["index.html", "labs/example/index.html"]);
  assert.equal(pageUrl(pages[1]), "https://miiduoa.github.io/labs/example/");
}));

test("nested pages are included but folders without a page are not", () => fixture(root => {
  mkdirSync(join(root, "case-studies", "case", "deep"), { recursive: true });
  writeFileSync(join(root, "case-studies", "case", "index.html"), "case");
  writeFileSync(join(root, "case-studies", "case", "deep", "index.html"), "deep");
  mkdirSync(join(root, "tools", "unfinished"));
  assert.deepEqual(discoverPages(root), [
    "index.html",
    "case-studies/case/index.html",
    "case-studies/case/deep/index.html"
  ]);
}));

test("site map must contain each owned page exactly once", () => {
  const pages = ["index.html", "labs/a/index.html"];
  const valid = "<urlset><loc>https://miiduoa.github.io/</loc><loc>https://miiduoa.github.io/labs/a/</loc></urlset>";
  assert.deepEqual(validateSitemap(valid, pages), []);
  assert.match(validateSitemap(valid + "<loc>https://miiduoa.github.io/labs/a/</loc>", pages).join(","), /duplicate/);
  assert.match(validateSitemap("<loc>https://miiduoa.github.io/</loc>", pages).join(","), /missing published page/);
  assert.match(validateSitemap(valid + "<loc>https://other.example/</loc>", pages).join(","), /unrecognized/);
});
