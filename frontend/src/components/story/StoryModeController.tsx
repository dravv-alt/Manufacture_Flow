"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  CirclePause,
  CirclePlay,
  Loader2,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { driver, type Driver } from "driver.js";
import { getScenarioSteps } from "@/components/story/scenarios";
import type { StoryEvidence, StoryStep } from "@/components/story/story.types";
import { evidenceLabel, isEvidenceMet } from "@/components/story/story-evidence";
import { useOperations, type DemoScenarioId, type StoryMode } from "@/contexts/OperationsContext";
import { StoryCursor } from "@/components/story/StoryCursor";

type StartDetail = { scenario: DemoScenarioId; mode: StoryMode };
const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

function getStepPhase(route: string, stepId: string): number {
  if (stepId === "recovered") return 6;
  if (route.includes("failure")) return 1;
  if (route.includes("warehouse") || route.includes("procurement")) return 2;
  if (route.includes("rerouting")) return 3;
  if (route.includes("shipment") || route.includes("notifications")) return 4;
  if (route.includes("maintenance")) return 5;
  return 0;
}

const PHASES = [
  { id: 1, label: "Failure" },
  { id: 2, label: "Resources" },
  { id: 3, label: "Reroute" },
  { id: 4, label: "Logistics" },
  { id: 5, label: "RTS" },
];

interface BackgroundWaitState {
  active: boolean;
  processName: string;
  detail: string;
  expectedState: string;
  elapsedSeconds: number;
  status: "running" | "success" | "error";
  error?: string;
}

function getBackgroundProcessInfo(step: StoryStep): { processName: string; detail: string } {
  switch (step.id) {
    case "telemetry":
      return {
        processName: "Telemetry Ingestion & Anomaly Detection",
        detail: "Ingesting vibration & thermal sensor telemetry into database. Awaiting LangGraph incident creation and allocation lock...",
      };
    case "approve-reroute":
      return {
        processName: "Production Reroute Authorization",
        detail: "Persisting approved routing plan. Diverting scheduled jobs to alternative workstations in database...",
      };
    case "reserve-bearing":
    case "reserve-bearing-confirm":
      return {
        processName: "Warehouse Stock Reservation",
        detail: "Atomically holding spare bearing BRG-10023 from inventory and linking reservation to active work order...",
      };
    case "maintenance-start":
      return {
        processName: "Workstation Maintenance Initialization",
        detail: "Transitioning workstation WS-102 into maintenance mode. Awaiting work order stage 3 in PostgreSQL...",
      };
    case "repair":
    case "rework":
      return {
        processName: "Maintenance Repair Audit Record",
        detail: "Submitting mechanical repair audit record. Updating work order to stage 4 in database...",
      };
    case "testing":
    case "retest":
      return {
        processName: "Diagnostic Spindle Test Run",
        detail: "Initiating machine diagnostic test run. Polling live sensor diagnostics for return-to-service validation...",
      };
    case "validation-fail":
      return {
        processName: "Safety Validation Recording",
        detail: "Registering validation failure in audit ledger. Flagging corrective rework while maintaining allocation lock...",
      };
    case "validation-pass":
      return {
        processName: "Return-to-Service Release",
        detail: "Submitting safety compliance pass. Releasing workstation lock and verifying RECOVERED status in database...",
      };
    default:
      return {
        processName: step.title,
        detail: step.description,
      };
  }
}

export function StoryModeController() {
  const router = useRouter();
  const pathname = usePathname();
  const operations = useOperations();
  const latest = useRef(operations);
  latest.current = operations;

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [timeoutInfo, setTimeoutInfo] = useState<{ expected: string; elapsed: number } | null>(null);

  // Dynamic panel placement to prevent occluding action elements
  const [panelPlacement, setPanelPlacement] = useState<"top" | "bottom">("bottom");

  // Detailed background process feedback state
  const [waitState, setWaitState] = useState<BackgroundWaitState | null>(null);

  const [cursor, setCursor] = useState<{
    x: number;
    y: number;
    visible: boolean;
    isClicking: boolean;
    mode: "default" | "pointer";
    actionText: string | null;
  }>({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 200,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 200,
    visible: false,
    isClicking: false,
    mode: "default",
    actionText: null,
  });

  const cancelledRef = useRef(false);
  const driverRef = useRef<Driver | null>(null);

  const steps = getScenarioSteps(operations.demoScenario);
  const step: StoryStep | undefined = steps[index];
  const currentPhase = step ? getStepPhase(step.route, step.id) : 0;

  // Initialize Driver.js
  useEffect(() => {
    if (typeof window !== "undefined") {
      driverRef.current = driver({
        animate: !operations.state.reducedMotion,
        smoothScroll: false,
        allowClose: false,
        overlayColor: "rgba(0, 0, 0, 0.72)",
        stagePadding: 10,
        stageRadius: 12,
        disableActiveInteraction: false,
      });
    }
    return () => {
      driverRef.current?.destroy();
    };
  }, [operations.state.reducedMotion]);

  // Manage html class and dataset for dynamic scroll padding
  useEffect(() => {
    if (active) {
      document.documentElement.classList.add("story-mode-active");
      document.documentElement.dataset.storyPlacement = panelPlacement;
    } else {
      document.documentElement.classList.remove("story-mode-active");
      delete document.documentElement.dataset.storyPlacement;
    }
    return () => {
      document.documentElement.classList.remove("story-mode-active");
      delete document.documentElement.dataset.storyPlacement;
    };
  }, [active, panelPlacement]);

  useEffect(() => {
    const listener = async (event: Event) => {
      const detail = (event as CustomEvent<StartDetail>).detail;
      setFailure(null);
      setTimeoutInfo(null);
      setWaitState(null);
      setIndex(0);
      setPaused(false);
      cancelledRef.current = false;
      const ready = await latest.current.enterDemo(detail.scenario, detail.mode);
      if (!ready) {
        setFailure(latest.current.backendError ?? "Demo runtime could not be prepared. Ensure backend is running.");
        setPaused(true);
        setActive(true);
        return;
      }
      setActive(true);
    };
    window.addEventListener("manufacture-flow:start-story", listener);
    return () => window.removeEventListener("manufacture-flow:start-story", listener);
  }, []);

  const waitForEvidence = async (currentStep: StoryStep, timeout = 35_000) => {
    if (currentStep.evidence.type === "none") return;

    const info = getBackgroundProcessInfo(currentStep);
    const started = Date.now();
    const expected = evidenceLabel(currentStep.evidence);

    setWaitState({
      active: true,
      processName: info.processName,
      detail: info.detail,
      expectedState: expected,
      elapsedSeconds: 0,
      status: "running",
    });

    const timer = window.setInterval(() => {
      setWaitState((prev) =>
        prev && prev.active
          ? { ...prev, elapsedSeconds: Math.round((Date.now() - started) / 1000) }
          : prev
      );
    }, 1000);

    try {
      while (!isEvidenceMet(currentStep.evidence, latest.current.activeCase)) {
        if (cancelledRef.current) {
          window.clearInterval(timer);
          setWaitState(null);
          return;
        }

        // Check for immediate backend / command errors to prevent hanging silently
        if (latest.current.commandError) {
          window.clearInterval(timer);
          const errMsg = latest.current.commandError;
          setWaitState({
            active: true,
            processName: info.processName,
            detail: info.detail,
            expectedState: expected,
            elapsedSeconds: Math.round((Date.now() - started) / 1000),
            status: "error",
            error: errMsg,
          });
          throw new Error(`Background command failed: ${errMsg}`);
        }

        if (Date.now() - started > timeout) {
          window.clearInterval(timer);
          const elapsed = Math.round((Date.now() - started) / 1000);
          setTimeoutInfo({ expected, elapsed });
          setPaused(true);
          throw new Error(`Timed out waiting for system state: ${expected}`);
        }

        await wait(1200);
        if (cancelledRef.current) {
          window.clearInterval(timer);
          setWaitState(null);
          return;
        }
        await latest.current.refresh();
      }

      // Evidence satisfied! Show affirmative success confirmation
      window.clearInterval(timer);
      setWaitState({
        active: true,
        processName: info.processName,
        detail: `State confirmed in database: ${expected}`,
        expectedState: expected,
        elapsedSeconds: Math.round((Date.now() - started) / 1000),
        status: "success",
      });

      // Hold success confirmation so user visually registers completion
      await wait(operations.state.reducedMotion ? 300 : 1200);
      setWaitState(null);
    } finally {
      window.clearInterval(timer);
    }
  };

  const locate = async (selector: string) => {
    const started = Date.now();
    while (Date.now() - started < 14_000) {
      if (cancelledRef.current) throw new Error("Step cancelled.");
      const element = document.querySelector<HTMLElement>(selector);
      if (element) return element;
      await wait(150);
    }
    throw new Error(`Tour target not found: ${selector}`);
  };

  // Wait until element position is completely stationary on screen (scrolling and transitions ended)
  const waitForStationaryElement = async (el: HTMLElement, maxMs = 1200): Promise<DOMRect> => {
    let prev = el.getBoundingClientRect();
    let stationaryFrames = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < maxMs) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const current = el.getBoundingClientRect();
      const dx = Math.abs(current.left - prev.left);
      const dy = Math.abs(current.top - prev.top);
      if (dx < 0.5 && dy < 0.5) {
        stationaryFrames++;
        if (stationaryFrames >= 4) {
          return current;
        }
      } else {
        stationaryFrames = 0;
        prev = current;
      }
    }
    return el.getBoundingClientRect();
  };

  // Perform tactile click with visual ripple, live re-calibration, and button depression
  const performClickAction = async (targetElement: HTMLElement, label?: string) => {
    if (cancelledRef.current) return;

    // 1. Wait if the button is temporarily disabled (e.g. pending prior mutation)
    const maxWait = 2500;
    const started = Date.now();
    while (Date.now() - started < maxWait) {
      const isDisabled =
        targetElement.hasAttribute("disabled") ||
        targetElement.getAttribute("aria-disabled") === "true";
      if (!isDisabled) break;
      await wait(100);
      if (cancelledRef.current) return;
    }

    // 2. LIVE RE-CALIBRATION: Get exact bounding rect right before clicking!
    const liveRect = targetElement.getBoundingClientRect();
    const clickX = liveRect.left + liveRect.width / 2;
    const clickY = liveRect.top + liveRect.height / 2;

    // 3. Snap cursor to live center and initiate visual click shockwave
    setCursor((prev) => ({
      ...prev,
      x: clickX,
      y: clickY,
      mode: "pointer",
      isClicking: true,
      actionText: label ?? "CLICK",
    }));
    targetElement.classList.add("story-action-target-clicking");

    // Tactile press duration (200ms)
    await wait(operations.state.reducedMotion ? 50 : 200);
    if (cancelledRef.current) {
      targetElement.classList.remove("story-action-target-clicking");
      return;
    }

    // 4. Fire physical click event
    targetElement.click();

    // 5. Hold pressed state so human observer registers the tactile button click
    await wait(operations.state.reducedMotion ? 50 : 180);

    // 6. Release click and spring back
    targetElement.classList.remove("story-action-target-clicking");
    setCursor((prev) => ({ ...prev, isClicking: false, actionText: null }));
  };

  // Focus element with Driver.js, auto-adjust panel placement, and glide cursor
  const highlightAndFocus = async (element: HTMLElement) => {
    if (cancelledRef.current) return;

    // 1. Determine optimal placement: if target is in lower screen, dock panel to TOP!
    const initialRect = element.getBoundingClientRect();
    const vh = window.innerHeight;
    const elementCenterY = initialRect.top + initialRect.height / 2;

    const shouldDockTop = elementCenterY > vh * 0.45 || initialRect.bottom > vh - 300;
    const newPlacement = shouldDockTop ? "top" : "bottom";
    setPanelPlacement(newPlacement);
    document.documentElement.dataset.storyPlacement = newPlacement;

    // 2. Center element in the unobstructed viewing zone:
    // If panel is at TOP: unobstructed safe zone is [220px .. vh - 40px]
    // If panel is at BOTTOM: unobstructed safe zone is [70px .. vh - 260px]
    const safeTop = newPlacement === "top" ? 220 : 70;
    const safeBottom = newPlacement === "top" ? vh - 40 : vh - 260;
    const safeCenter = safeTop + (safeBottom - safeTop) / 2;

    const needsScroll = initialRect.top < safeTop || initialRect.bottom > safeBottom;
    if (needsScroll) {
      const scrollDelta = (initialRect.top + initialRect.height / 2) - safeCenter;
      window.scrollBy({
        top: scrollDelta,
        behavior: operations.state.reducedMotion ? "auto" : "smooth",
      });
    }

    // 3. Wait until any scrolling or layout shift has 100% settled
    const settledRect = await waitForStationaryElement(element);
    if (cancelledRef.current) return;

    // 4. Highlight with Driver.js (smoothScroll: false ensures zero layout jump)
    if (driverRef.current) {
      driverRef.current.highlight({ element });
    }

    // Wait a brief tick for Driver.js overlay
    await wait(operations.state.reducedMotion ? 50 : 150);
    if (cancelledRef.current) return;

    // 5. Read precise coordinates after Driver highlight
    const finalRect = element.getBoundingClientRect();

    let targetX = finalRect.left + finalRect.width / 2;
    let targetY = finalRect.top + finalRect.height / 2;

    const isInteractive =
      element.tagName === "BUTTON" ||
      element.tagName === "A" ||
      element.tagName === "INPUT" ||
      element.getAttribute("role") === "button" ||
      element.closest("button, a, [role='button']") !== null;

    // For large card containers (>240px tall or >450px wide), locate the focal child
    if (finalRect.height > 240 || finalRect.width > 450) {
      const focal = element.querySelector<HTMLElement>(
        "button, a, [role='button'], h2, h3, [role='status'], [data-metric]"
      );
      if (focal) {
        const fRect = focal.getBoundingClientRect();
        targetX = fRect.left + fRect.width / 2;
        targetY = fRect.top + fRect.height / 2;
      } else {
        targetX = finalRect.left + Math.min(finalRect.width * 0.4, 220);
        targetY = finalRect.top + Math.min(finalRect.height * 0.35, 100);
      }
    }

    // 6. Glide cursor directly to target
    setCursor((prev) => ({
      ...prev,
      x: targetX,
      y: targetY,
      visible: true,
      mode: isInteractive || step?.mode === "action" ? "pointer" : "default",
      isClicking: false,
      actionText: null,
    }));

    // Cursor flight duration
    await wait(operations.state.reducedMotion ? 80 : 550);
    if (cancelledRef.current) return;

    // Settle pause so viewer registers cursor presence
    await wait(operations.state.reducedMotion ? 50 : 300);
  };

  const dispatchAction = async (currentStep: StoryStep, targetElement?: HTMLElement) => {
    if (cancelledRef.current) return;

    if (currentStep.mode === "system") {
      if (targetElement) {
        await performClickAction(targetElement, "TRIGGER");
      } else if (currentStep.action.type === "trigger_telemetry") {
        await latest.current.triggerDemo();
      }
      await waitForEvidence(currentStep);
      return;
    }

    if (currentStep.mode === "action") {
      if (targetElement) {
        await performClickAction(targetElement, "ACTION");
      } else if (currentStep.action.type === "workflow" && currentStep.action.command) {
        await latest.current.runWorkflowCommand(currentStep.action.command);
      }
      await waitForEvidence(currentStep);
      return;
    }

    // Observe step: keep highlighted, cursor idle on element
    await waitForEvidence(currentStep);
  };

  const runStep = useCallback(async () => {
    if (!step || running || paused) return;
    setRunning(true);
    setFailure(null);
    setTimeoutInfo(null);
    setWaitState(null);
    cancelledRef.current = false;

    try {
      if (pathname !== step.route) {
        driverRef.current?.destroy();
        router.push(step.route);
        await wait(operations.state.reducedMotion ? 150 : 800);
      }
      if (cancelledRef.current) return;

      let target: HTMLElement | undefined;
      if (step.target) {
        try {
          target = await locate(step.target);
          await highlightAndFocus(target);
        } catch (err) {
          // Fallback if target element is not ready
          if (step.mode !== "system") throw err;
        }
      }

      if (cancelledRef.current) return;

      if (operations.storyMode === "manual" && step.mode === "action") {
        // In manual action mode, wait for human action and evidence
        await waitForEvidence(step);
      } else {
        await dispatchAction(step, target);
      }

      if (cancelledRef.current) return;

      // Human comprehension delay
      if (operations.storyMode === "auto") {
        await wait(operations.state.reducedMotion ? 500 : 2000);
      } else {
        await wait(400);
      }

      if (cancelledRef.current) return;
      if (index === steps.length - 1) {
        driverRef.current?.destroy();
        setPaused(true);
      } else {
        setIndex((value) => value + 1);
      }
    } catch (error) {
      if (!cancelledRef.current) {
        setFailure(error instanceof Error ? error.message : "Story step failed.");
        setPaused(true);
      }
    } finally {
      setRunning(false);
    }
  }, [step, running, paused, pathname, operations.state.reducedMotion, operations.storyMode, router, index, steps.length]);

  useEffect(() => {
    if (active && operations.storyMode === "auto" && !paused && !running && !timeoutInfo && !waitState?.active) {
      void runStep();
    }
  }, [active, index, operations.storyMode, paused, pathname, running, timeoutInfo, waitState?.active, runStep]);

  if (!active || !step) return null;

  const exit = async () => {
    cancelledRef.current = true;
    driverRef.current?.destroy();
    setActive(false);
    setPaused(true);
    setWaitState(null);
    setCursor((value) => ({ ...value, visible: false, isClicking: false }));
    await operations.exitDemo();
    router.push("/dashboard");
  };

  const restart = async () => {
    cancelledRef.current = true;
    driverRef.current?.destroy();
    setPaused(true);
    setTimeoutInfo(null);
    setWaitState(null);
    setCursor((value) => ({ ...value, visible: false, isClicking: false }));
    if (await operations.resetDemo()) {
      setIndex(0);
      setFailure(null);
      cancelledRef.current = false;
      setPaused(false);
      router.push("/dashboard");
    }
  };

  const skipStep = () => {
    cancelledRef.current = true;
    driverRef.current?.destroy();
    setFailure(null);
    setTimeoutInfo(null);
    setWaitState(null);
    setRunning(false);
    setCursor((value) => ({ ...value, isClicking: false }));
    if (index < steps.length - 1) {
      setIndex((value) => value + 1);
      setPaused(false);
    } else {
      setPaused(true);
    }
  };

  const togglePlacement = () => {
    const next = panelPlacement === "top" ? "bottom" : "top";
    setPanelPlacement(next);
    document.documentElement.dataset.storyPlacement = next;
  };

  return (
    <>
      <button
        data-story="trigger-telemetry"
        onClick={() => void operations.triggerDemo()}
        className="fixed bottom-5 right-5 z-[1000000001] min-h-11 rounded-full bg-amber-300 px-4 text-xs font-bold text-black shadow-xl hover:bg-amber-400 transition-colors"
      >
        Trigger controlled telemetry
      </button>

      {/* Tactile Animated Simulated Cursor */}
      <StoryCursor
        x={cursor.x}
        y={cursor.y}
        visible={cursor.visible}
        isClicking={cursor.isClicking}
        mode={cursor.mode}
        actionText={cursor.actionText}
      />

      <aside
        role="dialog"
        aria-label="Story Mode controller"
        style={{
          transform: `translate3d(-50%, ${panelPlacement === "top" ? "5rem" : "calc(100vh - 100% - 1.25rem)"}, 0)`,
          transition: operations.state.reducedMotion
            ? "none"
            : "transform 650ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 350ms ease",
        }}
        className="story-mode-controller fixed left-1/2 top-0 z-[1000000001] w-[min(92vw,680px)] rounded-[1.5rem] border border-white/15 bg-[#1d1b1a]/95 p-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur will-change-transform"
      >
        {/* Recovery Phase Rail in Controller Overlay */}
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5 text-[10px] font-semibold tracking-wider text-white/50">
          <div className="flex items-center gap-1 sm:gap-2">
            {PHASES.map((phase) => {
              const isPast = currentPhase > phase.id || currentPhase === 6;
              const isCurrent = currentPhase === phase.id;
              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
                    isCurrent
                      ? "bg-amber-400/20 text-amber-300 font-bold"
                      : isPast
                      ? "text-emerald-400"
                      : "text-white/40"
                  }`}
                >
                  {isPast ? (
                    <Check className="size-3" />
                  ) : (
                    <span
                      className={`inline-block size-1.5 rounded-full ${
                        isCurrent ? "bg-amber-300 animate-pulse" : "bg-white/30"
                      }`}
                    />
                  )}
                  <span className="hidden sm:inline">{phase.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-amber-300">
              PHASE {currentPhase > 5 ? "COMPLETE" : `${currentPhase || 1} / 5`}
            </span>
            {/* Quick manual placement toggle */}
            <button
              onClick={togglePlacement}
              title={panelPlacement === "top" ? "Move panel to bottom" : "Move panel to top"}
              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              {panelPlacement === "top" ? (
                <ArrowDownToLine className="size-3.5" />
              ) : (
                <ArrowUpToLine className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-300 font-mono text-sm font-bold text-black">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.14em] text-amber-300">
                DEMO SANDBOX · {operations.storyMode.toUpperCase()}
              </span>
              <span className="text-[10px] text-white/50">
                {index + 1} / {steps.length}
              </span>
              {step.mode === "action" ? (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                  ACTION REQUIRED
                </span>
              ) : step.mode === "system" ? (
                <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
                  SYSTEM SIMULATION
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm leading-5 text-white/65">
              {operations.storyMode === "manual" && step.manualInstruction
                ? step.manualInstruction
                : step.description}
            </p>

            {/* Prominent Background Process Running Communication */}
            {waitState?.active ? (
              <div
                role="status"
                aria-live="polite"
                className={`mt-3 overflow-hidden rounded-xl border p-3.5 transition-all duration-300 ${
                  waitState.status === "success"
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200"
                    : waitState.status === "error"
                    ? "border-rose-500/50 bg-rose-950/40 text-rose-200"
                    : "border-amber-400/40 bg-amber-950/30 text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                    {waitState.status === "success" ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : waitState.status === "error" ? (
                      <AlertTriangle className="size-4 text-rose-400" />
                    ) : (
                      <Loader2 className="size-4 animate-spin text-amber-400" />
                    )}
                    <span
                      className={
                        waitState.status === "success"
                          ? "text-emerald-300"
                          : waitState.status === "error"
                          ? "text-rose-300"
                          : "text-amber-300"
                      }
                    >
                      {waitState.status === "success"
                        ? "BACKGROUND PROCESS COMPLETE"
                        : waitState.status === "error"
                        ? "BACKGROUND PROCESS CONFLICT"
                        : "BACKGROUND PROCESS RUNNING"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] opacity-75">
                    {waitState.elapsedSeconds}s elapsed
                  </span>
                </div>

                <p className="mt-1.5 text-xs leading-5 font-medium text-white/90">
                  {waitState.status === "error" && waitState.error
                    ? waitState.error
                    : waitState.detail}
                </p>

                {waitState.status === "running" ? (
                  <>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/60">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                        Awaiting:{" "}
                        <strong className="text-amber-300 font-mono">
                          {waitState.expectedState}
                        </strong>
                      </span>
                      <span className="font-mono">Simulation tick: 10s</span>
                    </div>
                    {/* Animated indeterminate progress bar */}
                    <div className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 animate-progress-shimmer" />
                    </div>
                  </>
                ) : null}

                {waitState.status === "error" ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setWaitState(null);
                        setPaused(false);
                        void runStep();
                      }}
                      className="rounded-lg bg-amber-300 px-3 py-1 font-bold text-black hover:bg-amber-400 transition-colors"
                    >
                      Retry Action
                    </button>
                    <button
                      onClick={skipStep}
                      className="rounded-lg bg-white/20 px-3 py-1 font-semibold text-white hover:bg-white/30 transition-colors"
                    >
                      Skip Step
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Diagnostic Timeout Display */}
            {timeoutInfo ? (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200"
              >
                <div className="flex items-center gap-1.5 font-bold tracking-wider text-amber-300">
                  <AlertTriangle className="size-4" />
                  DEMO WAITING FOR SYSTEM STATE
                </div>
                <p className="mt-1">
                  <span className="text-white/60">Expected:</span> {timeoutInfo.expected}
                </p>
                <p className="mt-0.5">
                  <span className="text-white/60">Elapsed:</span> {timeoutInfo.elapsed}s
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTimeoutInfo(null);
                      setPaused(false);
                      void runStep();
                    }}
                    className="rounded-lg bg-amber-300 px-3 py-1 font-bold text-black hover:bg-amber-400 transition-colors"
                  >
                    Retry Step
                  </button>
                  <button
                    onClick={skipStep}
                    className="rounded-lg bg-white/20 px-3 py-1 font-semibold text-white hover:bg-white/30 transition-colors"
                  >
                    Skip Step
                  </button>
                  <button
                    onClick={() => void restart()}
                    className="rounded-lg bg-white/10 px-3 py-1 font-semibold text-white/80 hover:bg-white/20 transition-colors"
                  >
                    Restart Demo
                  </button>
                </div>
              </div>
            ) : failure ? (
              <div
                role="alert"
                className="mt-2 rounded-lg bg-red-400/15 px-3 py-2 text-xs text-red-200"
              >
                <p>{failure}</p>
                <button onClick={skipStep} className="mt-2 font-bold underline">
                  Skip Step
                </button>
              </div>
            ) : null}
          </div>
          <button
            onClick={() => void exit()}
            aria-label="Exit Demo"
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() => {
              cancelledRef.current = !paused;
              setPaused((value) => !value);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold hover:bg-white/20 transition-colors"
          >
            {paused ? <CirclePlay className="size-4" /> : <CirclePause className="size-4" />}
            {paused ? "Resume" : "Pause"}
          </button>

          {operations.storyMode === "manual" ? (
            <button
              disabled={running || Boolean(waitState?.active)}
              onClick={() => void runStep()}
              className="min-h-10 rounded-full bg-amber-300 px-4 text-xs font-bold text-black disabled:opacity-50 hover:bg-amber-400 transition-colors"
            >
              {waitState?.active ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Waiting for system ({waitState.elapsedSeconds}s)…
                </span>
              ) : step.mode === "action" ? (
                "Perform highlighted action"
              ) : (
                "Continue"
              )}
            </button>
          ) : null}

          <button
            onClick={skipStep}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
            title="Advance to next step without waiting"
          >
            <SkipForward className="size-3.5" />
            Skip
          </button>

          <button
            onClick={() => void restart()}
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="size-4" />
            Restart
          </button>
        </div>
      </aside>
    </>
  );
}
