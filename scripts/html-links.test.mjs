import test from "node:test";
import assert from "node:assert/strict";
import { findUnsafeNewTabLinks } from "./html-links.mjs";

test("rejects an unprotected new-tab link", () => {
  assert.equal(findUnsafeNewTabLinks('<a href="/work" target="_blank">Work</a>').length, 1);
});

test("accepts noopener in either attribute order", () => {
  assert.deepEqual(findUnsafeNewTabLinks('<a rel="external noopener" href="/work" target="_BLANK">Work</a>'), []);
  assert.deepEqual(findUnsafeNewTabLinks("<a target='_blank' rel='noopener noreferrer'>Work</a>"), []);
});

test("ignores links that do not open a new tab", () => {
  assert.deepEqual(findUnsafeNewTabLinks('<a href="/work">Work</a><a target="_self" href="/">Home</a>'), []);
});

test("does not accept similar-looking rel tokens", () => {
  assert.equal(findUnsafeNewTabLinks('<a rel="notnoopener" target="_blank">Work</a>').length, 1);
});
