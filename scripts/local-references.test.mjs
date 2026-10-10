import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLocalReference, documentIds } from "./local-references.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "portfolio-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "case-studies", "sample"), { recursive: true });
  writeFileSync(join(root, "index.html"), '<h1 id="top">Home</h1><section id="專案"></section>');
  writeFileSync(join(root, "case-studies", "sample", "index.html"), '<h1 id="overview">Case</h1><h2 id="limits">Limits</h2>');
  writeFileSync(join(root, "site.css"), "body { margin: 0; }");
  return { root, page: "index.html", siblingPages: new Set(["foldpress"]) };
}

const valid = [
  ["same-page fragment", "#top", "local"],
  ["encoded Chinese fragment", "#%E5%B0%88%E6%A1%88", "local"],
  ["root-relative asset with query", "/site.css?v=2", "local"],
  ["cross-page fragment", "/case-studies/sample/#limits", "local"],
  ["explicit HTML file", "/case-studies/sample/index.html#overview", "local"],
  ["directory without trailing slash", "/case-studies/sample", "local"],
  ["absolute same-origin URL", "https://miiduoa.github.io/#top", "local"],
  ["protocol-relative same-origin URL", "//miiduoa.github.io/#top", "local"],
  ["external URL", "https://example.org/page#section", "external"],
  ["protocol-relative external URL", "//example.org/page", "external"],
  ["email", "mailto:hello@example.org", "external"],
  ["phone", "tel:+88612345678", "external"],
  ["independent project deployment", "/foldpress/", "sibling"],
  ["absolute independent project deployment", "https://miiduoa.github.io/foldpress/", "sibling"],
];
for (const [name, target, kind] of valid) test(name, (t) => assert.equal(checkLocalReference(target, fixture(t)).kind, kind));

const invalid = [
  ["empty destination", "", /empty destination/],
  ["placeholder fragment", "#", /empty destination/],
  ["malformed same-page fragment", "#%E0%A4%A", /malformed URL encoding/],
  ["malformed cross-page fragment", "/case-studies/sample/#%", /malformed URL encoding/],
  ["malformed pathname", "/broken%ZZ", /malformed URL encoding/],
  ["invalid URL", "https://[", /invalid URL/],
  ["missing local asset", "/absent.css", /missing local/],
  ["missing same-page fragment", "#absent", /missing anchor/],
  ["missing cross-page fragment", "/case-studies/sample/#absent", /missing anchor/],
  ["absolute URLs cannot bypass local checks", "https://miiduoa.github.io/missing.html", /missing local/],
  ["protocol-relative URLs cannot bypass local checks", "//miiduoa.github.io/#absent", /missing anchor/],
  ["sibling exemption does not cover arbitrary child assets", "/foldpress/missing.js", /missing local/],
  ["script URL", "javascript:alert(1)", /unsupported URL protocol/],
  ["local file URL", "file:///etc/passwd", /unsupported URL protocol/],
  ["insecure portfolio URL", "http://miiduoa.github.io/", /must use HTTPS/],
  ["unexpected portfolio port", "https://miiduoa.github.io:8443/", /default port/],
  ["URL credentials", "https://person:password@example.org/", /credentials/],
  ["encoded traversal", "/..%2foutside.html", /escapes repository/],
  ["encoded null byte", "/%00.html", /invalid character/],
  ["encoded backslash", "/..%5coutside.html", /invalid character/],
  ["leading whitespace", " /site.css", /whitespace/],
  ["embedded control character", "/site\n.css", /control character/],
];
for (const [name, target, pattern] of invalid) test(name, (t) => {
  const result = checkLocalReference(target, fixture(t));
  assert.equal(result.kind, "error");
  assert.match(result.issue, pattern);
});

test("nested page resolves links relative to its own directory", (t) => {
  const options = { ...fixture(t), page: "case-studies/sample/index.html" };
  assert.equal(checkLocalReference("../../#top", options).kind, "local");
  assert.equal(checkLocalReference("#limits", options).kind, "local");
});
test("images cannot use a sibling page exemption", (t) => {
  assert.equal(checkLocalReference("/foldpress/", { ...fixture(t), attribute: "src" }).kind, "error");
});
test("embedded data is allowed for src, not href", (t) => {
  const options = fixture(t);
  assert.equal(checkLocalReference("data:image/png;base64,AA==", { ...options, attribute: "src" }).kind, "external");
  assert.equal(checkLocalReference("data:text/html,hello", options).kind, "error");
});
test("symlinks cannot escape the repository", (t) => {
  const options = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), "portfolio-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, "page.html"), '<h1 id="outside">Outside</h1>');
  symlinkSync(join(outside, "page.html"), join(options.root, "escape.html"));
  assert.match(checkLocalReference("/escape.html", options).issue, /symlink escapes/);
});
test("document IDs exclude data attributes, comments and script/style text", () => {
  assert.deepEqual([...documentIds(`<div data-id="no" id='yes'></div><!-- <p id="comment"> --><script>const x = '<p id="script">';</script><style>/* <p id="style"> */</style><section id = "spaced"></section>`)], ["yes", "spaced"]);
});
