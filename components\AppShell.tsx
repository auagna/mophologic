"use client";

import { AssemblyPreview } from "./AssemblyPreview";
import { BottomBar } from "./BottomBar";
import { ControlPanel } from "./ControlPanel";
import { FormCanvas } from "./FormCanvas";
import { PatternPanel } from "./PatternPanel";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <main className="min-h-screen bg-lab-bg text-lab-text">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col">
        <TopBar />
        <section className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)_auto]">
          <ControlPanel />
          <FormCanvas />
          <AssemblyPreview />
          <div className="lg:col-start-2">
            <PatternPanel />
          </div>
          <div className="lg:col-start-3">
            <BottomBar />
          </div>
        </section>
      </div>
    </main>
  );
}
