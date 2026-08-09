"use client";

// The authored moving assembly is retained intact from 3d_views/mechanical-assembly-hero.html.
// The CNC-specific reference remains available separately for engineering labels and context.
export function CncExplodedScene({ progress: _progress }: { progress: number }) {
  return <div className="h-[560px] overflow-hidden rounded-xl border border-border bg-[#e7e1d2]"><iframe title="Interactive mechanical assembly diagnostic view" src="/reference-scenes/mechanical-assembly-hero.html" className="h-full w-full border-0" loading="lazy" /></div>;
}
