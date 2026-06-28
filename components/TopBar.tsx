"use client";

import { RefreshCw } from "lucide-react";
import { useFormLabStore } from "@/store/useFormLabStore";
import type { FormMode } from "@/types/formLab";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";

const modes: { value: FormMode; label: string }[] = [
  { value: "graphic", label: "Graphic Mode" },
  { value: "table", label: "Table Mode" },
  { value: "pattern", label: "Pattern on Table" }
];

export function TopBar() {
  const mode = useFormLabStore((state) => state.mode);
  const setMode = useFormLabStore((state) => state.setMode);
  const resetForm = useFormLabStore((state) => state.resetForm);

  return (
    <header className="flex min-h-14 flex-col gap-3 border-b border-lab-border bg-[#0a0b0d]/95 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center border border-lab-border bg-lab-panel text-[11px] font-black text-lab-blue">FL</div>
        <div>
          <h1 className="text-sm font-semibold leading-none tracking-normal">FORM LAB</h1>
          <p className="mt-1 text-[10px] leading-none text-lab-muted">controlled irregularity studio</p>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-2 sm:max-w-[640px]">
        <SegmentedControl value={mode} options={modes} onChange={setMode} className="flex-1" />
        <Button variant="ghost" onClick={resetForm} title="Reset form" aria-label="Reset form">
          <RefreshCw size={14} />
        </Button>
      </div>
    </header>
  );
}
