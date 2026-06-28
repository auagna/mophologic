"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { ForceCanvas } from "@/components/ForceCanvas";
import { ModulePreview } from "@/components/ModulePreview";

export function FormLab() {
  return (
    <main className="min-h-screen bg-lab-bg text-lab-text">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-lab-border px-4">
          <div>
            <h1 className="text-sm font-semibold tracking-normal">FORM LAB</h1>
            <p className="text-[11px] text-lab-muted">area-contained force bubble generator</p>
          </div>
          <div className="hidden text-[11px] uppercase text-lab-muted sm:block">bubbles repel, attract, carve, merge</div>
        </header>
        <section className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[292px_minmax(0,1fr)_300px]">
          <ControlPanel />
          <ForceCanvas />
          <ModulePreview />
        </section>
      </div>
    </main>
  );
}
