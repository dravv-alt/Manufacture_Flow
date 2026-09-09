"use client";

import React from "react";

export type CursorMode = "default" | "pointer";

interface StoryCursorProps {
  x: number;
  y: number;
  visible: boolean;
  isClicking: boolean;
  mode?: CursorMode;
  actionText?: string | null;
}

export function StoryCursor({
  x,
  y,
  visible,
  isClicking,
  mode = "default",
  actionText,
}: StoryCursorProps) {
  if (!visible) return null;

  const isPointer = mode === "pointer" || isClicking;

  return (
    <div
      aria-hidden
      className="story-cursor pointer-events-none fixed left-0 top-0 will-change-transform"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: isClicking ? "none" : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: 1000000002,
      }}
    >
      {/* 
        Click shockwave animation:
        Positioned relative to (0,0), which corresponds directly to the active fingertip 
      */}
      {isClicking && (
        <div className="absolute left-0 top-0 size-0 pointer-events-none">
          <span className="absolute -left-6 -top-6 size-12 rounded-full border-2 border-amber-400 bg-amber-400/30 animate-ping" />
          <span className="absolute -left-4 -top-4 size-8 rounded-full border border-amber-300 bg-amber-400/50 animate-pulse" />
          <span className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,1)]" />
        </div>
      )}

      {/* Cursor Body with transformOrigin pinned at (0, 0) */}
      <div
        className="relative transition-transform duration-100 ease-out"
        style={{
          transformOrigin: "0px 0px",
          transform: isClicking
            ? "scale(0.92) rotate(-3deg)"
            : "scale(1) rotate(0deg)",
        }}
      >
        {isPointer ? (
          /* Realistic Pointer Hand SVG with fingertip at (0, 0) */
          <svg
            width="32"
            height="32"
            viewBox="-6 -2 28 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)]"
          >
            <path
              d="M 0 0 C 1.5 0 2.6 0.9 2.6 2.4 L 2.6 10 C 3.3 9.3 4.3 9.3 5.1 9.9 C 5.6 10.3 5.9 10.9 5.9 11.6 C 6.6 10.9 7.6 10.9 8.4 11.5 C 8.9 11.9 9.2 12.5 9.2 13.2 C 9.9 12.6 10.9 12.7 11.6 13.3 C 12.3 13.9 12.6 14.8 12.4 15.7 L 11.9 18.6 C 11.3 22.2 8.6 24.8 5.1 24.8 C 2.1 24.8 -0.4 23.3 -2.1 20.8 L -4.4 17.8 C -5.7 16.3 -6.4 14.3 -5.4 12.8 C -4.4 11.3 -2.7 12.1 -1.7 13.5 L -1.1 14.8 L -1.1 2.4 C -1.1 0.9 -0.4 0 0 0 Z"
              fill="#18181b"
              stroke="#ffffff"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          /* Classic Arrow Cursor SVG with tip at (0, 0) */
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            <path
              d="M 0 0 L 0 18 L 4.5 14 L 8.5 22 L 11.5 20.5 L 7.5 12.5 L 13.5 12.5 Z"
              fill="#18181b"
              stroke="#ffffff"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Action badge indicator on click */}
        {isClicking && actionText ? (
          <span className="absolute left-6 top-1 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-black shadow-xl ring-1 ring-black/20 animate-in fade-in zoom-in-75 duration-100">
            {actionText}
          </span>
        ) : null}
      </div>
    </div>
  );
}
