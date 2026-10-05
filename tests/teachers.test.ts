import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SITEMAP_PAGES } from "../apps/web/src/site/sitemap.js";
import {
  demoHref,
  DISCUSSION,
  guidePath,
  LESSON_REAL,
  LESSON_SIMPLIFIED,
  LESSON_TOPICS,
  MISCONCEPTIONS,
  PLAN,
  TOPICS,
  WORKSHEET_QUESTIONS,
  worksheetPath,
} from "../apps/web/src/site/teachers.js";
import { readClassMode } from "../apps/web/src/viewer/class-mode.js";
import { isDemo } from "../apps/web/src/viewer/demo.js";
import { LESSONS } from "../apps/web/src/viewer/modules.js";
import { decodeReplay, REPLAY_PARAM } from "../apps/web/src/viewer/replay.js";
import { flatten, readCatalog } from "../scripts/i18n/catalog.js";

const page = (path: string) =>
  readFileSync(new URL(`../apps/web/app/${path}`, import.meta.url), "utf8");

describe("teacher guides", () => {
  it("plans one 45-minute period: question, demo, exploring, discussion", () => {
    assert.deepEqual(
      PLAN.map((part) => part.phase),
      ["opening", "demo", "explore", "discuss"],
    );
    assert.equal(
      PLAN.reduce((sum, part) => sum + part.minutes, 0),
      45,
    );
  });

  for (const locale of ["en", "he"]) {
    it(`has every part of every guide and worksheet in ${locale}`, () => {
      const copy = flatten(readCatalog(locale)!);
      const has = (key: string) =>
        assert.ok((copy.get(key) ?? "").trim().length > 0, key);
      for (const topic of TOPICS) has(`teachers.topics.${topic}`);
      for (const entry of LESSONS) {
        const own = `teachers.lessons.${entry.id}`;
        has(`${own}.goal`);
        has(`${own}.opening`);
        has(`${own}.answer`);
        const topics = LESSON_TOPICS[entry.id] ?? [];
        assert.ok(topics.length >= 2, entry.id);
        for (const topic of topics) has(`${own}.topics.${topic}`);
        for (const step of entry.lesson.steps) has(`${own}.notice.${step.id}`);
        assert.equal(DISCUSSION.length, 3);
        for (const id of DISCUSSION) has(`${own}.discuss.${id}`);
        assert.ok(MISCONCEPTIONS.length >= 2 && MISCONCEPTIONS.length <= 3);
        for (const id of MISCONCEPTIONS) {
          has(`${own}.misconceptions.${id}.claim`);
          has(`${own}.misconceptions.${id}.fix`);
        }
        for (const id of LESSON_REAL[entry.id] ?? []) has(`${own}.real.${id}`);
        const simplified = LESSON_SIMPLIFIED[entry.id] ?? [];
        assert.ok(simplified.length > 0, entry.id);
        for (const id of simplified) has(`${own}.simplified.${id}`);
        for (const id of WORKSHEET_QUESTIONS) {
          has(`${own}.worksheet.predict.${id}`);
          has(`${own}.worksheet.explain.${id}`);
        }
      }
      // Nothing is written for a part no guide shows.
      const used = new Set(
        LESSONS.flatMap((entry) => [
          ...(LESSON_TOPICS[entry.id] ?? []).map(
            (id) => `teachers.lessons.${entry.id}.topics.${id}`,
          ),
          ...(LESSON_REAL[entry.id] ?? []).map(
            (id) => `teachers.lessons.${entry.id}.real.${id}`,
          ),
          ...(LESSON_SIMPLIFIED[entry.id] ?? []).map(
            (id) => `teachers.lessons.${entry.id}.simplified.${id}`,
          ),
        ]),
      );
      for (const key of copy.keys()) {
        if (/^teachers\.lessons\.[^.]+\.(topics|real|simplified)\./.test(key)) {
          assert.ok(used.has(key), `${key} is never shown`);
        }
      }
    });
  }

  it("links each guide to its lesson's walkthrough, in class mode", () => {
    for (const entry of LESSONS) {
      const href = demoHref("he", entry);
      const [path, query = ""] = href.split("?");
      assert.equal(path, `/he${entry.path}`);
      const params = new URLSearchParams(query);
      assert.ok(isDemo(decodeReplay(params.get(REPLAY_PARAM)!), entry));
      assert.ok(readClassMode(`?${query}`));
    }
  });

  it("lists the guides in the sitemap and leaves the worksheets to the printer", () => {
    const paths = SITEMAP_PAGES.map((item) => item.path);
    assert.ok(paths.includes("/teachers"));
    for (const entry of LESSONS) {
      assert.equal(guidePath(entry), `/teachers/${entry.id}`);
      assert.ok(paths.includes(guidePath(entry)));
      assert.ok(!paths.includes(worksheetPath(entry)));
    }
    assert.match(
      page("[locale]/teachers/[lesson]/worksheet/page.tsx"),
      /robots: \{ index: false/,
    );
  });

  it("leaves curriculum alignment marked as unconfirmed, with no invented codes", () => {
    const source = page("[locale]/teachers/[lesson]/page.tsx");
    assert.match(source, /<!-- TODO: confirm with the biology instructors -->/);
    for (const locale of ["en", "he"]) {
      const copy = flatten(readCatalog(locale)!);
      assert.ok(copy.get("teachers.guide.curriculumPending"));
    }
  });

  it("prints on A4, black on white, without the site chrome", () => {
    const css = page("globals.css");
    assert.match(css, /@page \{\s*size: A4;/);
    assert.match(css, /@media print \{[\s\S]*--color-fg: #000000;/);
    for (const file of [
      "[locale]/teachers/[lesson]/page.tsx",
      "[locale]/teachers/[lesson]/worksheet/page.tsx",
    ]) {
      assert.match(page(file), /<div className="print:hidden">\s*<SiteHeader/);
    }
  });
});
