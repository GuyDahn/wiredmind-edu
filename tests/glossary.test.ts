import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALES } from "../apps/web/src/i18n/locales.js";
import type { MessageTree } from "../apps/web/src/i18n/messages.js";
import {
  findTerm,
  GLOSSARY_PATH,
  GLOSSARY_TERMS,
  relatedTerms,
  termLessons,
  termPath,
  termSteps,
  TERM_SLUGS,
} from "../apps/web/src/site/glossary.js";
import { glossaryJsonLd, termJsonLd } from "../apps/web/src/site/json-ld.js";
import { SITEMAP_PAGES } from "../apps/web/src/site/sitemap.js";
import { SITE_URL } from "../apps/web/src/site/site.js";
import { findLesson } from "../apps/web/src/viewer/modules.js";
import { GENERAL_TERMS, TERM_IDS } from "../apps/web/src/viewer/terms.js";
import {
  displayWidth,
  flatten,
  readCatalog,
  searchSnippets,
  TITLE_WIDTH,
} from "../scripts/i18n/catalog.js";

describe("glossary", () => {
  it("gives every term but the two lesson buttons its own address", () => {
    assert.deepEqual(
      TERM_IDS.filter((id) => !(id in TERM_SLUGS)),
      ["stimulate", "silence"],
    );
    const slugs = GLOSSARY_TERMS.map((id) => TERM_SLUGS[id]);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const id of GLOSSARY_TERMS) {
      assert.match(TERM_SLUGS[id], /^[a-z]+(-[a-z]+)*$/);
      assert.equal(termPath(id), `${GLOSSARY_PATH}/${TERM_SLUGS[id]}`);
      assert.equal(findTerm(TERM_SLUGS[id]), id);
    }
    assert.equal(findTerm("stimulate"), undefined);
    assert.equal(findTerm("giantfiber"), undefined);
  });

  it("lists the glossary and every term page in the sitemap", () => {
    const paths = SITEMAP_PAGES.map((item) => item.path);
    assert.ok(paths.includes(GLOSSARY_PATH));
    for (const id of GLOSSARY_TERMS) assert.ok(paths.includes(termPath(id)));
  });

  it("points a lesson's term at that lesson and the steps that name it", () => {
    const escape = findLesson("escape")!;
    assert.deepEqual(termLessons("giantfiber"), [escape]);
    assert.deepEqual(termLessons("neuron"), []);
    const en = readCatalog("en") as MessageTree;
    assert.deepEqual(termSteps(escape, "giantfiber", en), [
      "loom",
      "jump",
      "silence",
      "restore",
    ]);
    assert.deepEqual(termSteps(escape, "looming", en), ["loom", "silence"]);
    assert.deepEqual(termSteps(escape, "kenyon", en), []);
  });

  it("relates a term to the others in its group, never to itself or a button", () => {
    assert.deepEqual(relatedTerms("giantfiber"), [
      "looming",
      "nervecord",
      "jump",
      "reflex",
      "sensory",
      "motor",
      "electricalsynapse",
    ]);
    const basics = relatedTerms("connectome");
    assert.equal(basics.length, GENERAL_TERMS.length - 3);
    assert.ok(!basics.includes("connectome"));
    for (const id of GLOSSARY_TERMS) assert.ok(relatedTerms(id).length > 0);
  });

  it("keeps every term's search title within what results show, in every language", () => {
    for (const locale of LOCALES) {
      const flat = flatten(readCatalog(locale)!);
      const titles = searchSnippets(flat).filter(
        (snippet) =>
          snippet.key.startsWith("glossary.termTitle (") ||
          snippet.key === "glossary.metaTitle" ||
          /^lessons\.[^.]+\.searchTitle$/.test(snippet.key),
      );
      assert.equal(titles.length, TERM_IDS.length + 1 + 3);
      for (const title of titles) {
        assert.ok(
          displayWidth(title.text) <= TITLE_WIDTH,
          `${locale} ${title.key}: ${title.text}`,
        );
        assert.doesNotMatch(title.text, /\{term\}/);
      }
    }
  });

  it("describes a term as part of its language's glossary", () => {
    const set = glossaryJsonLd({
      locale: "he",
      path: GLOSSARY_PATH,
      name: "מילון",
      description: "…",
      terms: [{ name: "קונקטום", path: termPath("connectome") }],
    });
    const term = termJsonLd({
      locale: "he",
      path: termPath("connectome"),
      glossaryPath: GLOSSARY_PATH,
      name: "קונקטום",
      description: "…",
    });
    assert.equal(term.url, `${SITE_URL}/he/glossary/connectome`);
    assert.deepEqual(term.inDefinedTermSet, { "@id": set["@id"] });
    assert.equal(set["@id"], `${SITE_URL}/he/glossary#glossary`);
  });
});
