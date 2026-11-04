"use client";

import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, localePath } from "../i18n/locales.js";
import { LINKS } from "../site/site.js";
import { TranslateNotice } from "../site/translate-notice.js";
import { modeHref } from "./class-mode.js";
import { enqueue } from "./commands.js";
import { TERM_ANCHOR, useCircuitCopy, useLessonCopy } from "./copy.js";
import { DEMO_PACE, DEMO_RESULT_MS, demoRun } from "./demo.js";
import {
  awaitsGuess,
  controlState,
  focusFor,
  meetsGoal,
  type LessonGoal,
  type LessonModule,
  type LessonPhase,
  type LessonStep,
} from "./lesson.js";
import { IntroActions, IntroCard } from "./intro.js";
import { INTRO_SCREENS } from "./intro-screens.js";
import { JourneyActions, JourneyCard } from "./journey-card.js";
import { LESSONS, type LessonEntry } from "./modules.js";
import { groupColor } from "./module.js";
import { Controls, press } from "./panel.js";
import { Exercises } from "./exercises.js";
import { ComparisonCard, SHOW_COMPARISONS } from "./comparison.js";
import { usePathwayView } from "./pathway-view.js";
import {
  PausedNote,
  resumeWave,
  SpeedControl,
  StepModeToggle,
} from "./playback-controls.js";
import { useProgress } from "./progress.js";
import { startPlayback, stopPlayback } from "./recorder.js";
import { Sheet, type SheetState } from "./sheet.js";
import { GUIDED_SPEED, useViewerStore } from "./store.js";
import { StoryPanel, storyArt } from "./story.js";
import { Toolbar } from "./toolbar.js";
import type { ControlAction, ControlGate, ModuleSpec } from "./types.js";
import { FOCUS_RING } from "./ui.js";

/** Gap between a silence toggle and the puff we send for the learner. */
const PUFF_DELAY_MS = 500;

const BUTTON = `min-h-12 w-full rounded-xl px-4 text-base font-semibold transition-colors classroom:min-h-16 classroom:text-2xl ${FOCUS_RING}`;
/** Small print under the lesson text: the hint, the clock. Bigger on a projector. */
const HINT = "text-sm text-fg-subtle classroom:text-xl";

export function ModuleRunner({
  entry,
  notice,
  credit,
  autoDemo = false,
  onDemoEnd,
}: {
  entry: LessonEntry;
  /** A message to show above the lesson, e.g. why a replay link failed. */
  notice?: string | null;
  /** Site credit at the very end of the panel. */
  credit?: ReactNode;
  /** Opened from a "Show me" link: play the walkthrough instead of the intro. */
  autoDemo?: boolean;
  /** The walkthrough stopped or ran out, and the lesson is the reader's again. */
  onDemoEnd?: () => void;
}) {
  const { module, lesson } = entry;
  const t = useTranslations("viewer.lesson");
  const d = useTranslations("viewer.demo");
  const copy = useLessonCopy(lesson);
  const [phase, setPhase] = useState<LessonPhase>({
    kind: "step",
    index: 0,
    done: false,
  });
  const [puffPending, setPuffPending] = useState(false);
  const [sheet, setSheet] = useState<SheetState>("peek");
  const puffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intro = useViewerStore((state) => state.intro);
  const classMode = useViewerStore((state) => state.classMode);
  const journey = useViewerStore((state) => state.chapter === "journey");
  const [introScreen, setIntroScreen] = useState(0);
  const stimulating = useViewerStore((state) => state.stimulating);
  const live = useViewerStore((state) => state.circuit === module.id);
  const ready = useViewerStore((state) => state.status === "ready");
  const puffing = Object.values(stimulating).some(Boolean);
  // The walkthrough: the lesson's ideal run, pressed for the reader.
  const [demo, setDemo] = useState(false);
  const demoStarted = useRef(false);
  const run = useMemo(() => demoRun(entry), [entry]);
  const applied = useViewerStore((state) => state.playback?.applied ?? 0);

  const step = phase.kind === "step" ? lesson.steps[phase.index] : undefined;
  // In a walkthrough the puff after a silence is one of its own presses.
  const demoPuffPending =
    demo &&
    phase.kind === "step" &&
    phase.done &&
    applied < (run.end[phase.index] ?? 0);
  const pending = demo ? demoPuffPending : puffPending;
  const revealed = phase.kind === "step" && phase.done && !pending && !puffing;
  const watching = phase.kind === "step" && phase.done && !revealed;

  const clearPuff = useCallback(() => {
    if (puffTimer.current !== null) clearTimeout(puffTimer.current);
    puffTimer.current = null;
    setPuffPending(false);
  }, []);

  const startOver = useCallback(() => {
    clearPuff();
    useViewerStore.getState().resetControls();
    enqueue({ type: "reset", seed: module.seed });
    setPhase({ kind: "step", index: 0, done: false });
    setSheet("peek");
  }, [clearPuff, module.seed]);

  const stopDemo = useCallback(() => {
    stopPlayback();
    useViewerStore.getState().setPlayback(null);
    setDemo(false);
    onDemoEnd?.();
  }, [onDemoEnd]);

  const startDemo = useCallback(() => {
    clearPuff();
    const store = useViewerStore.getState();
    store.setIntro(false);
    // The walkthrough is the lesson itself, past the story and the zoom.
    store.setChapter("lesson");
    store.resetControls();
    enqueue({ type: "reset", seed: module.seed });
    startPlayback(run.replay, DEMO_PACE);
    store.setPlayback({
      applied: 0,
      total: run.replay.actions.length,
      done: false,
    });
    setPhase({ kind: "step", index: 0, done: false });
    setSheet("peek");
    setDemo(true);
  }, [clearPuff, module.seed, run]);

  // The circuit is cached across pages, so start from a clean brain once
  // this lesson's own circuit is running. A "Show me" link starts on the
  // walkthrough, once.
  useEffect(() => {
    if (!live) return;
    if (!autoDemo) startOver();
    else if (!demoStarted.current) {
      demoStarted.current = true;
      startDemo();
    }
  }, [live, autoDemo, startOver, startDemo]);

  useEffect(
    () => () => {
      clearPuff();
      stopPlayback();
      useViewerStore.getState().setPlayback(null);
      useViewerStore.getState().setFocus([]);
    },
    [clearPuff],
  );

  // Each press of the walkthrough meets its step's goal, as a tap would.
  useEffect(() => {
    if (!demo || applied === 0) return;
    const index = run.stepOf[applied - 1];
    if (index === undefined) return;
    setPhase((current) =>
      current.kind === "step" &&
      (current.index < index || (current.index === index && !current.done))
        ? { kind: "step", index, done: true }
        : current,
    );
  }, [demo, applied, run]);

  // It leaves each result up long enough to read, then moves on. It ends at
  // the question, which is the class's to answer.
  useEffect(() => {
    if (!demo || !revealed) return;
    const timer = setTimeout(() => {
      setPhase((current) => {
        if (current.kind !== "step") return current;
        const index = current.index + 1;
        return index < lesson.steps.length
          ? { kind: "step", index, done: false }
          : { kind: "check", picked: null };
      });
    }, DEMO_RESULT_MS);
    return () => clearTimeout(timer);
  }, [demo, revealed, lesson.steps.length]);

  useEffect(() => {
    if (demo && phase.kind !== "step") stopDemo();
  }, [demo, phase.kind, stopDemo]);

  useEffect(() => {
    useViewerStore.getState().setFocus(focusFor(lesson, phase));
  }, [lesson, phase]);

  // The scene numbers each wave by this lesson's pathways.
  useEffect(() => {
    const store = useViewerStore.getState();
    store.setPathways(lesson.pathways);
    return () => {
      const last = useViewerStore.getState();
      last.setPathways([]);
      last.setPreview(null);
    };
  }, [lesson]);

  // Guided steps run at half the old pace. Free play runs at whatever the
  // learner picked, which lasts for the visit and is never stored.
  const guided = phase.kind === "step" || phase.kind === "check";
  useEffect(() => {
    const store = useViewerStore.getState();
    store.setSpeed(guided ? GUIDED_SPEED : store.freeSpeed);
  }, [guided]);

  // The pathway diagram shows the puff a step is about to send before it
  // goes: with what is silenced now, so it gives no prediction away.
  const silencedNow = useViewerStore((state) => state.silenced);
  const lastStimulus = useViewerStore((state) => state.pathway?.stimulus);
  useEffect(() => {
    const store = useViewerStore.getState();
    const stimulus =
      phase.kind === "step"
        ? step?.goal.type === "stimulate"
          ? step.goal.colorGroup
          : step?.puff
        : (lastStimulus ?? module.stimuli[0]?.colorGroup);
    const silenced = Object.keys(silencedNow)
      .filter((name) => silencedNow[name])
      .sort();
    store.setPreview(stimulus ? { stimulus, silenced } : null);
  }, [phase.kind, step, silencedNow, lastStimulus, module.stimuli]);

  // Every lesson opens on its story, then the zoom from the fly to a neuron,
  // unless a "Show me" link asked for the walkthrough. Nothing remembers that
  // they were seen: no cookie, no storage. Skip is one tap each. "How to
  // read this brain" waits behind the "?" button.
  // The store starts on the story, and every runner puts it back there when
  // it goes. This one loads while the story is read, so by the time it
  // mounts the reader may have skipped ahead: it leaves the chapter alone.
  useEffect(() => {
    const store = useViewerStore.getState();
    store.setIntro(false);
    store.setLevel(0);
    if (autoDemo) store.setChapter("lesson");
    return () => {
      const last = useViewerStore.getState();
      last.setIntro(false);
      last.setLevel(0);
      last.setChapter("story");
    };
  }, [autoDemo]);

  const closeJourney = useCallback(() => {
    useViewerStore.getState().setChapter("lesson");
  }, []);

  // A look back at the fly stops the walkthrough, as the intro does.
  useEffect(() => {
    if (journey && demo) stopDemo();
  }, [journey, demo, stopDemo]);

  useEffect(() => {
    if (journey) setSheet("peek");
  }, [journey]);

  const closeIntro = useCallback(() => {
    useViewerStore.getState().setIntro(false);
  }, []);

  // Asking how to read the brain mid-walkthrough stops the walkthrough.
  useEffect(() => {
    if (intro && demo) stopDemo();
  }, [intro, demo, stopDemo]);

  useEffect(() => {
    if (!intro) return;
    setIntroScreen(0);
    setSheet("peek");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeIntro();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [intro, closeIntro]);

  // On a phone the sheet gets out of the way while the brain is busy, and
  // comes back with the answer. Desktop ignores it.
  useEffect(() => {
    if (watching) setSheet("min");
  }, [watching]);
  useEffect(() => {
    if (revealed) setSheet("peek");
  }, [revealed]);
  useEffect(() => {
    if (phase.kind === "check" || phase.kind === "win") setSheet("full");
    if (phase.kind === "free") setSheet("peek");
  }, [phase.kind]);

  const gate: ControlGate = (kind, colorGroup) =>
    controlState(lesson, phase, kind, colorGroup);

  /** Sends the puff a silence step shows its effect with, after a beat. */
  function sendPuff(puff: string) {
    setPuffPending(true);
    puffTimer.current = setTimeout(() => {
      puffTimer.current = null;
      useViewerStore.getState().setStimulating(puff, true);
      enqueue({ type: "stimulate", colorGroup: puff });
      setPuffPending(false);
    }, PUFF_DELAY_MS);
  }

  function onAction(action: ControlAction) {
    if (demo || phase.kind !== "step" || phase.done || !step) return;
    if (awaitsGuess(lesson, phase)) return;
    if (!meetsGoal(step.goal, action)) return;
    setPhase({ ...phase, done: true });
    if (step.puff) sendPuff(step.puff);
  }

  /** Stops the walkthrough where it is. The brain and the step stay as they are. */
  function takeOver() {
    const owed = demoPuffPending ? step?.puff : null;
    stopDemo();
    // Stopped between a silence and its puff: the lesson still owes the puff.
    if (owed) sendPuff(owed);
  }

  function next() {
    if (phase.kind !== "step") return;
    const index = phase.index + 1;
    if (index < lesson.steps.length) {
      setPhase({ kind: "step", index, done: false });
    } else {
      setPhase({ kind: "check", picked: null });
    }
  }

  const solved =
    phase.kind === "check" &&
    phase.picked !== null &&
    lesson.check.choices[phase.picked]?.correct === true;
  // A walkthrough presses for the reader, so it asks for no prediction.
  const guessing = !demo && awaitsGuess(lesson, phase);
  const started = phase.kind !== "step" || phase.index > 0 || phase.done;

  function win() {
    useProgress.getState().finish(entry.id);
    setPhase({ kind: "win" });
  }

  return (
    <Sheet
      state={sheet}
      onState={setSheet}
      label={copy.plain("title")}
      moment={
        journey
          ? "journey"
          : intro
            ? `intro-${introScreen}`
            : `${phase.kind}-${phase.kind === "step" ? phase.index : ""}-${revealed}`
      }
      footer={
        journey ? (
          <JourneyActions resume={started} onDone={closeJourney} />
        ) : intro ? (
          <IntroActions
            screen={introScreen}
            onNext={() =>
              setIntroScreen((value) =>
                Math.min(value + 1, INTRO_SCREENS.length - 1),
              )
            }
            onClose={closeIntro}
          />
        ) : demo ? (
          <DemoBar
            module={module}
            counter={
              phase.kind === "step" || phase.kind === "check" ? (
                <StepCounter lesson={lesson} phase={phase} />
              ) : null
            }
            goal={
              phase.kind === "step" && step && !phase.done ? step.goal : null
            }
            watching={watching}
            pending={pending}
            onStop={takeOver}
          />
        ) : (
          <Footer
            entry={entry}
            phase={phase}
            goal={
              phase.kind === "step" && step && !phase.done ? step.goal : null
            }
            guessing={guessing}
            puffPending={pending}
            watching={watching}
            revealed={revealed}
            solved={solved}
            onAction={onAction}
            onNext={next}
            onWin={win}
            onFree={() => setPhase({ kind: "free" })}
          />
        )
      }
    >
      {/* On a projector the panel holds the lesson and nothing else. */}
      {classMode ? null : (
        <>
          <PanelTranslateNotice />
          {/* Jumping to another lesson waits until the guided steps are done. */}
          {guided ? null : <Toolbar entry={entry} />}
        </>
      )}
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100"
        >
          {notice}
        </p>
      ) : null}
      {journey ? <JourneyCard entry={entry} /> : null}
      {intro && !journey ? (
        <IntroCard module={module} screen={introScreen} />
      ) : null}
      <section
        aria-label={copy.plain("title")}
        hidden={intro || journey}
        className="flex flex-col gap-4 rounded-2xl bg-overlay-strong p-4 [&[hidden]]:hidden"
      >
        {demo ? (
          <p
            data-demo="playing"
            className="self-start rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg classroom:text-lg"
          >
            {d("playing")}
          </p>
        ) : null}
        {phase.kind === "win" ? null : (
          <MissionGoal entry={entry} goal={copy.plain("mission.goal")} />
        )}
        {phase.kind === "step" && step ? (
          <>
            <p
              className={`${TERM_ANCHOR} text-lg leading-snug text-fg classroom:text-3xl`}
            >
              {copy.rich(`steps.${step.id}.text`)}
            </p>
            {step.predict && !demo ? (
              <Predict
                lesson={lesson}
                step={step}
                guess={phase.guess}
                locked={phase.done}
                revealed={revealed}
                onGuess={(guess) => setPhase({ ...phase, guess })}
              />
            ) : null}
            <div aria-live="polite" className="flex flex-col gap-4">
              {revealed ? (
                <p
                  data-step-result=""
                  className={`${TERM_ANCHOR} border-s-4 border-fg/40 ps-3 text-base leading-snug text-fg-muted classroom:text-3xl`}
                >
                  {copy.rich(`steps.${step.id}.result`)}
                </p>
              ) : phase.done ? (
                <p className={HINT}>{t("watching")}</p>
              ) : demo || guessing ? null : (
                <p className={HINT}>{t("tapCue")}</p>
              )}
            </div>
            {/* The one setting a guided step offers: stop after each group. */}
            {classMode ? null : <StepModeToggle />}
          </>
        ) : null}
        {phase.kind === "win" ? <Win entry={entry} /> : null}
        {phase.kind === "win" || phase.kind === "free" ? (
          <Exercises entry={entry} />
        ) : null}
        {SHOW_COMPARISONS && phase.kind === "win" ? (
          <ComparisonCard lessonId={entry.id} />
        ) : null}
        {phase.kind === "check" ? (
          <Check
            lesson={lesson}
            picked={phase.picked}
            onPick={(picked) => setPhase({ kind: "check", picked })}
          />
        ) : null}
        {phase.kind === "free" ? (
          <>
            <h2 className="text-lg font-semibold text-fg classroom:text-2xl">
              {copy.plain("freePlay.title")}
            </h2>
            <p
              className={`${TERM_ANCHOR} text-base leading-snug text-fg-muted classroom:text-3xl`}
            >
              {copy.rich("freePlay.text")}
            </p>
            <SpeedControl />
            <StepModeToggle />
          </>
        ) : null}
        {!demo &&
        ((phase.kind === "step" && phase.index === 0 && !phase.done) ||
          phase.kind === "free") ? (
          <button
            type="button"
            data-demo-start=""
            disabled={!live || !ready}
            onClick={startDemo}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong px-4 text-base font-semibold text-fg hover:bg-overlay disabled:opacity-50 classroom:min-h-16 classroom:text-2xl ${FOCUS_RING}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-4 shrink-0 fill-current rtl:-scale-x-100"
            >
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
            {d("start")}
          </button>
        ) : null}
        {demo ||
        (phase.kind === "step" && phase.index === 0 && !phase.done) ? null : (
          <button
            type="button"
            onClick={startOver}
            className="inline-flex min-h-11 items-center self-start text-sm text-fg-subtle underline underline-offset-4 hover:text-fg-muted classroom:text-lg"
          >
            {t("again")}
          </button>
        )}
      </section>
      {/* Every other button waits for free play: a guided step has one. */}
      {intro || journey || phase.kind !== "free" ? null : (
        <Controls
          module={module}
          gate={gate}
          onAction={onAction}
          readOnly={demo}
        />
      )}
      {classMode ? null : <PanelCredit>{credit}</PanelCredit>}
    </Sheet>
  );
}

/** Asks for help translating, for readers the site does not speak to yet. */
export function PanelTranslateNotice() {
  const locale = useLocale();
  const t = useTranslations("translate");
  if (locale !== DEFAULT_LOCALE) return null;
  return (
    <TranslateNotice
      notice={t("notice", { language: "{language}" })}
      cta={t("cta")}
      dismiss={t("dismiss")}
      href={LINKS.translate}
      className="-mx-4 -mt-1 md:-mt-4"
    />
  );
}

/** The site credit line, below everything a lesson needs. */
export function PanelCredit({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      className="border-t border-border pt-4 text-xs text-fg-subtle"
      data-tap-target="text"
    >
      {children}
    </div>
  );
}

/** While the walkthrough plays: what it is about to press, and the way out. */
function DemoBar({
  module,
  counter,
  goal,
  watching,
  pending,
  onStop,
}: {
  module: ModuleSpec;
  /** "Step 3 of 6", which stays in sight while the walkthrough plays. */
  counter: ReactNode;
  goal: LessonGoal | null;
  watching: boolean;
  pending: boolean;
  onStop: () => void;
}) {
  const t = useTranslations("viewer.lesson");
  const d = useTranslations("viewer.demo");
  const circuit = useCircuitCopy(module);
  const action = !goal
    ? null
    : goal.type === "stimulate"
      ? t("cueStimulate")
      : goal.on
        ? t("cueSilence")
        : t("cueSwitchOn");
  const paused = useViewerStore((state) => state.paused);
  return (
    <div className="flex flex-col gap-2">
      {counter}
      {paused ? (
        <>
          <PausedNote module={module} />
          <NextGroupButton module={module} />
        </>
      ) : watching ? (
        <Watching module={module} pending={pending} />
      ) : (
        <p
          aria-live="polite"
          className="py-1 text-base font-semibold text-fg classroom:text-2xl"
        >
          {goal && action
            ? d("upNext", { action, name: circuit.name(goal.colorGroup) })
            : d("playing")}
        </p>
      )}
      <button
        type="button"
        data-demo-stop=""
        onClick={onStop}
        className={`${BUTTON} border border-border-strong text-fg hover:bg-overlay`}
      >
        {d("stop")}
      </button>
    </div>
  );
}

/** The one thing to do next, pinned where a thumb rests. */
function Footer({
  entry,
  phase,
  goal,
  guessing,
  puffPending,
  watching,
  revealed,
  solved,
  onAction,
  onNext,
  onWin,
  onFree,
}: {
  entry: LessonEntry;
  phase: LessonPhase;
  goal: LessonGoal | null;
  /** The step is waiting for a prediction, so its button is not offered yet. */
  guessing: boolean;
  puffPending: boolean;
  watching: boolean;
  revealed: boolean;
  solved: boolean;
  onAction: (action: ControlAction) => void;
  onNext: () => void;
  onWin: () => void;
  onFree: () => void;
}) {
  const { lesson } = entry;
  const guided = phase.kind === "step" || phase.kind === "check";
  return (
    <div className="flex flex-col gap-2">
      {guided ? <StepCounter lesson={lesson} phase={phase} /> : null}
      <FooterAction
        entry={entry}
        phase={phase}
        goal={goal}
        guessing={guessing}
        puffPending={puffPending}
        watching={watching}
        revealed={revealed}
        solved={solved}
        onAction={onAction}
        onNext={onNext}
        onWin={onWin}
        onFree={onFree}
      />
    </div>
  );
}

/** The footer's one big button, or what to do instead of pressing one. */
function FooterAction({
  entry,
  phase,
  goal,
  guessing,
  puffPending,
  watching,
  revealed,
  solved,
  onAction,
  onNext,
  onWin,
  onFree,
}: Parameters<typeof Footer>[0]) {
  const { module, lesson } = entry;
  const t = useTranslations("viewer.lesson");
  const m = useTranslations("viewer.mission");
  const titles = useTranslations("lessons");
  const locale = useLocale();
  const classMode = useViewerStore((state) => state.classMode);
  const paused = useViewerStore((state) => state.paused);
  if (guessing) {
    return (
      <p data-predict-first="" className={`py-3 text-center ${HINT}`}>
        {m("predictFirst")}
      </p>
    );
  }
  if (goal)
    return <CueButton module={module} goal={goal} onAction={onAction} />;
  if (paused) {
    return (
      <>
        <PausedNote module={module} />
        <NextGroupButton module={module} />
      </>
    );
  }
  if (watching) return <Watching module={module} pending={puffPending} />;
  if (revealed && phase.kind === "step") {
    const last = phase.index + 1 >= lesson.steps.length;
    return (
      <NextButton
        data={{ "data-step-next": "" }}
        sub={
          last
            ? t("question")
            : t("toStep", {
                number: phase.index + 2,
                total: lesson.steps.length + 1,
              })
        }
        onClick={onNext}
      />
    );
  }
  if (phase.kind === "check") {
    return solved ? (
      <button
        type="button"
        data-mission-finish=""
        onClick={onWin}
        className={`${BUTTON} bg-accent text-accent-fg hover:bg-accent-hover`}
      >
        {m("finish")}
      </button>
    ) : (
      <p className={`py-3 text-center ${HINT}`}>{t("pickAnswer")}</p>
    );
  }
  const after = LESSONS.find((item) => item.number === entry.number + 1);
  if (phase.kind === "win") {
    return (
      <div className="flex flex-col gap-2">
        <Link
          data-mission-onward=""
          href={modeHref(
            after
              ? localePath(locale, after.path)
              : `${localePath(locale, "/")}#lessons`,
            classMode,
          )}
          className={`${BUTTON} flex items-center justify-center gap-2 bg-accent py-2 text-center text-accent-fg hover:bg-accent-hover`}
        >
          {after
            ? m("nextMission", { title: titles(`${after.id}.title`) })
            : m("map")}
        </Link>
        <button
          type="button"
          data-free-play=""
          onClick={onFree}
          className={`${BUTTON} border border-border-strong text-fg hover:bg-overlay`}
        >
          {t("freePlay")}
        </button>
      </div>
    );
  }
  if (after) {
    return (
      <Link
        href={modeHref(localePath(locale, after.path), classMode)}
        className={`${BUTTON} flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover`}
      >
        {t("nextLesson", { title: titles(`${after.id}.title`) })}
      </Link>
    );
  }
  const others = LESSONS.filter((item) => item.id !== entry.id);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm text-fg-subtle">{t("finished")}</p>
      <div role="group" aria-label={t("moreLessons")} className="flex gap-2">
        {others.map((item) => (
          <Link
            key={item.id}
            href={modeHref(localePath(locale, item.path), classMode)}
            className={`${BUTTON} flex-1 border border-border-strong text-fg-muted hover:bg-overlay`}
          >
            {titles(`${item.id}.title`)}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** The step's goal control, repeated at the bottom so it is always in reach. */
function CueButton({
  module,
  goal,
  onAction,
}: {
  module: ModuleSpec;
  goal: LessonGoal;
  onAction: (action: ControlAction) => void;
}) {
  const status = useViewerStore((state) => state.status);
  const t = useTranslations("viewer.lesson");
  const circuit = useCircuitCopy(module);
  const ready = status === "ready";
  const color = groupColor(module, goal.colorGroup);
  const name = circuit.name(goal.colorGroup);
  const action: ControlAction =
    goal.type === "stimulate"
      ? { type: "stimulate", colorGroup: goal.colorGroup }
      : { type: "silence", colorGroup: goal.colorGroup, on: goal.on };
  const verb =
    goal.type === "stimulate"
      ? t("cueStimulate")
      : goal.on
        ? t("cueSilence")
        : t("cueSwitchOn");
  return (
    <NextButton
      data={{ "data-cue": "" }}
      disabled={!ready}
      color={color}
      sub={ready ? `${verb}: ${name}` : t("loadingBrain")}
      onClick={() => press(action, onAction)}
      pulse
    />
  );
}

/**
 * The lesson's one primary button: "Next", in large type, with what it will
 * do underneath. A guided step never shows another.
 */
function NextButton({
  sub,
  color,
  disabled = false,
  pulse = false,
  data,
  onClick,
}: {
  sub: string;
  /** The color of the group it acts on, as a dot beside what it does. */
  color?: string;
  disabled?: boolean;
  /** Pulse the dot: this is the thing to tap. */
  pulse?: boolean;
  data: Record<`data-${string}`, string>;
  onClick: () => void;
}) {
  const t = useTranslations("viewer.lesson");
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-primary=""
      {...data}
      className={`flex min-h-16 w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl bg-accent px-4 py-2 text-accent-fg transition-transform hover:bg-accent-hover active:scale-[0.99] disabled:opacity-50 classroom:min-h-20 ${FOCUS_RING}`}
    >
      <span className="text-xl leading-tight font-bold classroom:text-3xl">
        {t("next")}
      </span>
      <span className="flex items-center gap-2 text-sm leading-snug opacity-90 classroom:text-xl">
        {color ? (
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ring-1 ring-current ${pulse ? "motion-safe:animate-ping" : ""}`}
            style={{ backgroundColor: color }}
          />
        ) : null}
        {sub}
      </span>
    </button>
  );
}

/** "Next" while step mode holds the wave: on to the next group. */
function NextGroupButton({ module }: { module: ModuleSpec }) {
  const t = useTranslations("viewer.playback");
  const circuit = useCircuitCopy(module);
  const view = usePathwayView();
  const at = view.current ? view.order.indexOf(view.current) : -1;
  const upcoming = at >= 0 ? view.order[at + 1] : undefined;
  return (
    <NextButton
      data={{ "data-next-group": "" }}
      color={upcoming ? groupColor(module, upcoming) : undefined}
      sub={
        upcoming
          ? t("nextGroupNamed", {
              number: view.numbers.get(upcoming) ?? at + 2,
              name: circuit.plain(upcoming),
            })
          : t("finishWave")
      }
      onClick={resumeWave}
    />
  );
}

/** While the puff runs: where to look, and how far through it the fly is. */
function Watching({
  module,
  pending,
}: {
  module: ModuleSpec;
  pending: boolean;
}) {
  const puff = useViewerStore((state) => state.puff);
  const t = useTranslations("viewer.lesson");
  const format = useFormatter();
  const circuit = useCircuitCopy(module);
  const fraction = puff ? Math.min(1, puff.elapsedMs / puff.totalMs) : 0;
  const name = puff ? circuit.name(puff.colorGroup) : null;
  return (
    <div className="flex flex-col gap-2 py-1" aria-live="polite">
      <p className="flex items-center gap-2 text-base font-semibold text-fg classroom:text-2xl">
        <span aria-hidden="true" className="md:hidden">
          ↑
        </span>
        <span aria-hidden="true" className="hidden md:inline rtl:-scale-x-100">
          →
        </span>
        {pending ? t("gettingReady") : t("watchBrain")}
      </p>
      <div
        role="progressbar"
        aria-label={t("puffProgress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-overlay-strong"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <p className="text-xs text-fg-subtle tabular-nums classroom:text-lg">
        {name && puff
          ? t("puffClock", {
              name,
              elapsed: format.number(Math.round(puff.elapsedMs)),
              total: format.number(puff.totalMs),
            })
          : t("slowMotion")}
      </p>
    </div>
  );
}

/** The mission, in one line, above every step. */
function MissionGoal({ entry, goal }: { entry: LessonEntry; goal: string }) {
  const m = useTranslations("viewer.mission");
  return (
    <p
      data-mission-goal=""
      className="flex flex-col gap-0.5 rounded-xl border border-border-strong px-3 py-2"
    >
      <span className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-lg">
        {m("label", { number: entry.number })}
      </span>
      <span className="text-base leading-snug font-semibold text-fg classroom:text-2xl">
        {goal}
      </span>
    </p>
  );
}

/**
 * "Predict before you tap": the step's button stays shut until an answer is
 * picked. No answer is marked wrong before the brain has shown what happens,
 * and none costs anything after.
 */
function Predict({
  lesson,
  step,
  guess,
  locked,
  revealed,
  onGuess,
}: {
  lesson: LessonModule;
  step: LessonStep;
  guess: number | undefined;
  /** The experiment has run, so the prediction stands as it was made. */
  locked: boolean;
  revealed: boolean;
  onGuess: (index: number) => void;
}) {
  const m = useTranslations("viewer.mission");
  const copy = useLessonCopy(lesson);
  const choices = step.predict?.choices ?? [];
  const picked = guess === undefined ? undefined : choices[guess];
  return (
    <div
      data-predict={guess === undefined ? "open" : "picked"}
      className="flex flex-col gap-2 rounded-xl border border-border-strong p-3"
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-lg">
        {m("predictLabel")}
      </p>
      <p className="text-base leading-snug font-semibold text-fg classroom:text-2xl">
        {copy.plain(`steps.${step.id}.predict.question`)}
      </p>
      <div
        role="group"
        aria-label={m("predictLabel")}
        className="flex flex-col gap-2"
      >
        {choices.map((choice, index) => {
          const chosen = guess === index;
          return (
            <button
              key={choice.id}
              type="button"
              data-predict-choice={choice.id}
              aria-pressed={chosen}
              disabled={locked}
              onClick={() => onGuess(index)}
              className={`min-h-12 rounded-xl border px-4 py-2.5 text-start text-base leading-snug disabled:cursor-default classroom:min-h-16 classroom:text-2xl ${FOCUS_RING} ${chosen ? "border-fg bg-overlay-strong text-fg" : "border-border-strong bg-overlay text-fg"} ${locked && !chosen ? "opacity-50" : ""}`}
            >
              {copy.plain(`steps.${step.id}.predict.choices.${choice.id}`)}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className={HINT}>
        {revealed && picked ? (
          <span data-predict-outcome={picked.correct ? "held" : "surprise"}>
            {picked.correct ? m("predictHeld") : m("predictSurprise")}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** The win screen: the story's last panel, and what the mission found. */
function Win({ entry }: { entry: LessonEntry }) {
  const m = useTranslations("viewer.mission");
  const copy = useLessonCopy(entry.lesson);
  const t = useTranslations(`lessons.${entry.id}`);
  const name = useTranslations("character")("name");
  return (
    <div data-mission-win="" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-fg classroom:text-3xl">
        {m("winTitle", { number: entry.number })}
      </h2>
      <StoryPanel
        art={storyArt(entry.id, "ending")}
        caption={t("story.ending.caption", { name })}
        bubble={t("story.ending.bubble", { name })}
        name={name}
        eager
      />
      <p
        className={`${TERM_ANCHOR} border-s-4 border-emerald-400 ps-3 text-base leading-snug text-fg-muted classroom:text-2xl`}
      >
        {copy.rich("mission.win")}
      </p>
    </div>
  );
}

/**
 * "Step 3 of 6", pinned with the footer so it is always in sight. The last
 * step is the question.
 */
function StepCounter({
  lesson,
  phase,
}: {
  lesson: LessonModule;
  phase: LessonPhase;
}) {
  const t = useTranslations("viewer.lesson");
  const total = lesson.steps.length + 1;
  const at = phase.kind === "step" ? phase.index : lesson.steps.length;
  return (
    <div data-step-counter="" className="flex items-center gap-3">
      <p className="shrink-0 text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase classroom:text-lg">
        {t("step", { number: at + 1, total })}
      </p>
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < at ? "bg-accent" : index === at ? "bg-fg-subtle" : "bg-overlay-strong"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Check({
  lesson,
  picked,
  onPick,
}: {
  lesson: LessonModule;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const choice = picked === null ? undefined : lesson.check.choices[picked];
  const solved = choice?.correct === true;
  const feedbackRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("viewer.lesson");
  const copy = useLessonCopy(lesson);

  // On a phone the feedback sits below the answers.
  useEffect(() => {
    if (picked === null) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    feedbackRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [picked]);
  return (
    <>
      <p
        className={`${TERM_ANCHOR} text-lg leading-snug text-fg classroom:text-3xl`}
      >
        {copy.rich("check.question")}
      </p>
      <div
        role="group"
        aria-label={t("answers")}
        className="flex flex-col gap-2"
      >
        {lesson.check.choices.map((item, index) => {
          const chosen = picked === index;
          const tone = !chosen
            ? "border-border-strong bg-overlay text-fg"
            : item.correct
              ? "border-emerald-400 bg-emerald-400/15 text-fg"
              : "border-amber-400 bg-amber-400/10 text-fg";
          return (
            <button
              key={item.id}
              type="button"
              disabled={solved}
              aria-pressed={chosen}
              data-check-choice={item.id}
              onClick={() => onPick(index)}
              className={`min-h-12 rounded-xl border px-4 py-3 text-start text-base leading-snug disabled:cursor-default classroom:min-h-16 classroom:text-2xl ${FOCUS_RING} ${tone}`}
            >
              {copy.plain(`check.choices.${item.id}.text`)}
            </button>
          );
        })}
      </div>
      <div ref={feedbackRef} aria-live="polite" className="scroll-mb-4">
        {choice ? (
          <p
            className={`${TERM_ANCHOR} text-base leading-snug text-fg-muted classroom:text-2xl`}
          >
            {copy.rich(`check.choices.${choice.id}.feedback`)}
            {/* A margin, not a space: Chinese and Japanese put none between sentences. */}
            {solved ? null : <span className="ms-1">{t("tryAnother")}</span>}
          </p>
        ) : null}
      </div>
    </>
  );
}
