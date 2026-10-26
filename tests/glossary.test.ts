import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import {
  ANSWER_PARTS,
  findQuestion,
  lessonQuestions,
  questionLessons,
  questionPath,
  QUESTIONS,
  QUESTIONS_PATH,
} from "../apps/web/src/site/questions.js";
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

  it("keeps the glossary and its term pages out of search and the sitemap", () => {
    const paths = SITEMAP_PAGES.map((item) => item.path);
    assert.ok(!paths.includes(GLOSSARY_PATH));
    for (const id of GLOSSARY_TERMS) assert.ok(!paths.includes(termPath(id)));
    for (const page of ["page.tsx", "[term]/page.tsx"]) {
      const source = readFileSync(
        new URL(`../apps/web/app/[locale]/glossary/${page}`, import.meta.url),
        "utf8",
      );
      assert.match(source, /robots: \{ index: false, follow: true \}/);
    }
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

describe("questions", () => {
  it("gives each question an address, a lesson that exists, and terms with pages", () => {
    const slugs = QUESTIONS.map((question) => question.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const question of QUESTIONS) {
      assert.match(question.slug, /^[a-z]+(-[a-z]+)*$/);
      assert.equal(findQuestion(question.slug), question);
      assert.equal(
        questionPath(question),
        `${QUESTIONS_PATH}/${question.slug}`,
      );
      if (question.lesson) assert.ok(findLesson(question.lesson));
      assert.ok(questionLessons(question).length > 0);
      for (const id of question.terms) assert.ok(GLOSSARY_TERMS.includes(id));
    }
    assert.deepEqual(
      lessonQuestions(findLesson("escape")!).map((question) => question.id),
      ["swat", "reaction"],
    );
  });

  it("lists the questions in the sitemap and has every answer in every language", () => {
    const paths = SITEMAP_PAGES.map((item) => item.path);
    assert.ok(paths.includes(QUESTIONS_PATH));
    for (const question of QUESTIONS) {
      assert.ok(paths.includes(questionPath(question)));
    }
    for (const locale of LOCALES) {
      const flat = flatten(readCatalog(locale)!);
      for (const question of QUESTIONS) {
        for (const part of ["title", "short", ...ANSWER_PARTS]) {
          assert.ok(
            flat.get(`questions.items.${question.id}.${part}`),
            `${locale} ${question.id}.${part}`,
          );
        }
      }
    }
  });

  it("puts the lesson in words under the viewer", () => {
    const source = readFileSync(
      new URL(
        "../apps/web/app/[locale]/modules/[id]/page.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(source, /<LessonAbout locale=\{locale\} entry=\{entry\} \/>/);
  });
});
