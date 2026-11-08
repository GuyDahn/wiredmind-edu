import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mapping from "../apps/web/content/course-mapping.json" with { type: "json" };
import {
  comparisonCourseLessons,
  courseLessonsFor,
  courseLessonTitle,
  inLocale,
} from "../apps/web/src/site/course.js";
import {
  comparisonFor,
  comparisonsShown,
  WHY_FLY,
} from "../apps/web/src/viewer/comparisons.js";
import { LESSONS } from "../apps/web/src/viewer/modules.js";

describe("course mapping", () => {
  it("maps every lesson to course lessons the syllabus has", () => {
    assert.deepEqual(Object.keys(mapping.courseLessons), [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    for (const entry of LESSONS) {
      const lessons = courseLessonsFor(entry.id);
      assert.ok(lessons.length > 0, entry.id);
      for (const number of lessons) {
        assert.ok(courseLessonTitle(number, "he"));
        assert.ok(courseLessonTitle(number, "en"));
      }
    }
    assert.deepEqual(courseLessonsFor("smell-memory"), [2, 6]);
    assert.deepEqual(courseLessonsFor("compass"), [2, 4]);
    assert.deepEqual(courseLessonsFor("escape"), [2, 4, 7]);
  });

  it("says aligned with the syllabus, and claims no partnership", () => {
    assert.match(mapping.aligned.he, /מותאם לסילבוס הקורס/);
    assert.match(mapping.aligned.en, /Aligned with the course syllabus/);
    // The note at the top says what is not claimed; the copy must not claim it.
    const copy: Record<string, unknown> = { ...mapping };
    delete copy.$comment;
    const all = JSON.stringify(copy).toLowerCase();
    assert.doesNotMatch(all, /partner|endorse|official|שותפות|בשיתוף|רשמי/);
  });

  it("reads English in every language but Hebrew", () => {
    assert.equal(inLocale({ he: "א", en: "a" }, "he"), "א");
    assert.equal(inLocale({ he: "א", en: "a" }, "de"), "a");
  });
});

describe("comparison cards", () => {
  it("are off unless the flag says true", () => {
    const before = process.env.NEXT_PUBLIC_SHOW_COMPARISONS;
    delete process.env.NEXT_PUBLIC_SHOW_COMPARISONS;
    assert.equal(comparisonsShown(), false);
    process.env.NEXT_PUBLIC_SHOW_COMPARISONS = "1";
    assert.equal(comparisonsShown(), false);
    process.env.NEXT_PUBLIC_SHOW_COMPARISONS = "true";
    assert.equal(comparisonsShown(), true);
    if (before === undefined) delete process.env.NEXT_PUBLIC_SHOW_COMPARISONS;
    else process.env.NEXT_PUBLIC_SHOW_COMPARISONS = before;
  });

  it("have a draft card for every lesson, in Hebrew and English", () => {
    for (const entry of LESSONS) {
      const card = comparisonFor(entry.id);
      assert.ok(card, entry.id);
      assert.equal(card.reviewed, false, `${entry.id} is a draft`);
      for (const part of [
        card.fly,
        card.mammals,
        card.birds,
        card.shared,
        card.question,
      ]) {
        assert.ok(part.he.trim() && part.en.trim(), entry.id);
      }
      assert.ok(card.sources.length > 0, `${entry.id} cites its draft sources`);
      // Brain evolution and the lesson's own course lessons.
      assert.deepEqual(
        comparisonCourseLessons(entry.id),
        [...new Set([3, ...courseLessonsFor(entry.id)])].sort((a, b) => a - b),
      );
    }
    assert.equal(WHY_FLY.reviewed, false);
    assert.equal(WHY_FLY.points.he.length, WHY_FLY.points.en.length);
  });
});
