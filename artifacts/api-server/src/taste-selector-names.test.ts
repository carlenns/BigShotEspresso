import assert from "node:assert/strict";
import { test } from "node:test";
import { STANDARD_SELECTORS, canonicalKeyFor, normalizeSelectorName } from "./lib/taste-selector-names";

test("normalizeSelectorName capitalizes each word and lower-cases the rest", () => {
  assert.equal(normalizeSelectorName("mInTy FreshNeSs"), "Minty Freshness");
  assert.equal(normalizeSelectorName("  minty   freshness "), "Minty Freshness");
  assert.equal(normalizeSelectorName("Wine-like Acidity"), "Wine-like Acidity");
  assert.equal(normalizeSelectorName("   "), "");
});

test("canonicalKeyFor builds a category-prefixed slug", () => {
  assert.equal(canonicalKeyFor("finish", "Minty Freshness"), "finish.minty-freshness");
  assert.equal(canonicalKeyFor("character", "Wine-like Acidity"), "character.wine-like-acidity");
});

test("shipped standard selectors are normalized and have unique keys", () => {
  const keys = new Set<string>();
  for (const s of STANDARD_SELECTORS) {
    assert.equal(normalizeSelectorName(s.name), s.name, `${s.name} is normalized`);
    assert.notEqual(s.category, "custom", `${s.name} has a standard category`);
    const key = canonicalKeyFor(s.category, s.name);
    assert.equal(keys.has(key), false, `${key} is unique`);
    keys.add(key);
  }
});
