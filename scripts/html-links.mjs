// New-tab links must not retain access to the source window.
export function findUnsafeNewTabLinks(html) {
  const unsafe = [];
  for (const [element] of html.matchAll(/<a\b[^>]*>/gi)) {
    const target = element.match(/\btarget\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (target?.toLowerCase() !== "_blank") continue;

    const rel = element.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
    const tokens = rel.toLowerCase().trim().split(/\s+/);
    if (!tokens.includes("noopener")) unsafe.push(element);
  }
  return unsafe;
}
