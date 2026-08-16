"use client";

// The authored CNC diagnostic is retained intact from 3d_views/FINAL_EXPLODED_CNC.html.
export function CncExplodedScene({ progress: _progress }: { progress: number }) {
  return <div className="h-[620px] overflow-hidden rounded-xl border border-border bg-[#e7e1d2]"><iframe title="WS-102 CNC exploded diagnostic view" src="/reference-scenes/final-exploded-cnc.html" className="h-full w-full border-0" loading="lazy" /></div>;
}
