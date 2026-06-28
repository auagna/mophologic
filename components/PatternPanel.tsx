"use client";

import { useState } from "react";
import { useFormLabStore } from "@/store/useFormLabStore";
import type { PatternType } from "@/types/formLab";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Slider } from "./ui/Slider";

const patternOptions: { value: PatternType; label: string }[] = [
  { value: "cellular", label: "Cellular" },
  { value: "vein", label: "Vein" },
  { value: "branch", label: "Branch" },
  { value: "dots", label: "Dots" },
  { value: "flow", label: "Flow" },
  { value: "tangent", label: "Tangent" }
];

const tabs = ["Pattern on Table", "Graphic Pattern Generator", "Texture Overlay"] as const;

export function PatternPanel() {
  const state = useFormLabStore();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Pattern on Table");

  return (
    <section className="border border-lab-border bg-lab-panel shadow-panel">
      <div className="flex flex-wrap gap-1 border-b border-lab-border p-2">
        {tabs.map((tab) => (
          <Button key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 p-3 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-end">
        <div className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase text-lab-muted">Pattern Type</span>
          <SegmentedControl value={state.patternType} options={patternOptions} onChange={state.setPatternType} className="grid-cols-3 md:grid-cols-6" />
        </div>
        <Slider label="Pattern Density" value={state.patternDensity} min={0} max={100} onChange={(value) => state.updateParam("patternDensity", value)} />
        <Slider label="Pattern Scale" value={state.patternScale} min={0} max={100} onChange={(value) => state.updateParam("patternScale", value)} />
        <div className="grid min-w-[150px] gap-3">
          <Slider label="Stroke Width" value={state.patternStrokeWidth} min={0.5} max={7} step={0.1} onChange={(value) => state.updateParam("patternStrokeWidth", Number(value.toFixed(1)))} />
          <label className="flex items-center justify-between gap-3 text-[11px] text-lab-muted">
            Show Pattern
            <input type="checkbox" checked={state.showPattern} onChange={(event) => state.updateParam("showPattern", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
          </label>
        </div>
      </div>
    </section>
  );
}
