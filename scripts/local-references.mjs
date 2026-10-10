import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const origin = "https://miiduoa.github.io";
const inside = (root, path) => {
  const part = relative(root, path);
  return part === "" || (!isAbsolute(part) && part !== ".." && !part.startsWith("../") && !part.startsWith("..\\"));
};

// This checker reads the quoted attributes used by the hand-authored site.
// It is not an HTML sanitizer or a replacement for browser testing.
export function documentIds(html) {
  const markup = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  return new Set([...markup.matchAll(/<[^>]+>/g)].flatMap(([tag]) => {
    const match = /\sid\s*=\s*(["'])(.*?)\1/i.exec(tag);
    return match ? [match[2]] : [];
  }));
}

/** Validate one authored href/src without making network requests. */
export function checkLocalReference(target, { root, page, siblingPages = new Set(), attribute = "href" }) {
  const error = (issue) => ({ kind: "error", issue: `${issue}: ${target}` });
  if (typeof target !== "string" || !target.trim() || target.trim() === "#") return error("empty destination");
  if (target !== target.trim() || /[\u0000-\u001f\u007f]/.test(target)) return error("whitespace or control character in URL");

  let url;
  try {
    url = new URL(target, `${origin}/${page}`);
  } catch {
    return error("invalid URL");
  }
  if (["mailto:", "tel:"].includes(url.protocol) && attribute === "href") return { kind: "external" };
  if (url.protocol === "data:" && attribute === "src") return { kind: "external" };
  if (!["http:", "https:"].includes(url.protocol)) return error("unsupported URL protocol");
  if (url.username || url.password) return error("credentials in URL");
  if (url.origin !== origin) {
    if (url.hostname === "miiduoa.github.io") return error("portfolio URL must use HTTPS and the default port");
    return { kind: "external" };
  }

  let pathname, fragment;
  try {
    pathname = decodeURIComponent(url.pathname);
    fragment = decodeURIComponent(url.hash.slice(1));
  } catch {
    return error("malformed URL encoding");
  }
  if (/[\u0000-\u001f\u007f\\]/.test(pathname)) return error("invalid character in local path");

  const base = resolve(root);
  const destination = resolve(base, `.${pathname}`);
  if (!inside(base, destination)) return error("link escapes repository");

  // Independent GitHub Pages deployments are not local files. Do not imply
  // that their HTTP status, assets or fragments have been checked here.
  const parts = pathname.split("/").filter(Boolean);
  if (attribute === "href" && parts.length === 1 && pathname.endsWith("/") && siblingPages.has(parts[0])) {
    return { kind: "sibling" };
  }

  let file = destination;
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    if (!statSync(file).isFile()) return error("local target is not a file");
    if (!inside(realpathSync(base), realpathSync(file))) return error("symlink escapes repository");
  } catch {
    return error(`missing local ${attribute} target`);
  }

  if (fragment && /\.html?$/i.test(file)) {
    const ids = documentIds(readFileSync(file, "utf8"));
    if (!ids.has(fragment)) return error(`missing anchor #${fragment}`);
  }
  return { kind: "local" };
}
