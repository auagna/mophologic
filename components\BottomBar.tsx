"use client";

import { Check, Copy, Download, FileImage } from "lucide-react";
import { useState } from "react";
import { copyCurrentSvg, exportCurrentPng, exportCurrentSvg } from "@/lib/exportSvg";
import { useFormLabStore } from "@/store/useFormLabStore";
import { Button } from "./ui/Button";

export function BottomBar() {
  const mode = useFormLabStore((state) => state.mode);
  const seed = useFormLabStore((state) => state.seed);
  const showGrid = useFormLabStore((state) => state.showGrid);
  const showBoundary = useFormLabStore((state) => state.showBoundary);
  const updateParam = useFormLabStore((state) => state.updateParam);
  const [copied, setCopied] = useState(false);

  const svgName = `form-lab-${mode}-${seed}.svg`;
  const pngName = `form-lab-${mode}-${seed}.png`;

  return (
    <section className="grid gap-2 border border-lab-border bg-lab-panel p-3 shadow-panel">
      <div className="grid grid-cols-3 gap-1.5">
        <Button onClick={() => exportCurrentSvg(svgName)}>
          <Download size={13} />
          SVG
        </Button>
        <Button onClick={() => exportCurrentPng(pngName)}>
          <FileImage size={13} />
          PNG
        </Button>
        <Button
          onClick={async () => {
            await copyCurrentSvg();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          Copy
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-between gap-2 text-[11px] text-lab-muted">
          Grid
          <input type="checkbox" checked={showGrid} onChange={(event) => updateParam("showGrid", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-lab-muted">
          Boundary
          <input type="checkbox" checked={showBoundary} onChange={(event) => updateParam("showBoundary", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
        </label>
      </div>
    </section>
  );
}
