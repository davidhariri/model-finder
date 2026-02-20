"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Model, models, overallScore, bestSpeed, bestCost, getLab } from "@/data/models";
import CostPerformanceScatter from "@/components/CostPerformanceScatter";
import RankingTabs from "@/components/RankingTabs";
import ModelDetail from "@/components/ModelDetail";
import MinScoreSlider from "@/components/MinScoreSlider";
import BrandIcon from "@/components/BrandIcon";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function Home() {
  const [minScore, setMinScore] = useState(70);
  const [minSpeedVal, setMinSpeedVal] = useState(0);
  const [requireVision, setRequireVision] = useState(false);
  const [requireOpenWeights, setRequireOpenWeights] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [closingModal, setClosingModal] = useState(false);
  const [sortCol, setSortCol] = useState<"model" | "creator" | "score" | "cost" | "speed" | "released" | null>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const aboutPanelRef = useRef<HTMLDivElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!optionsOpen && !aboutOpen) return;
    function handleClick(e: MouseEvent) {
      if (optionsOpen) {
        if (
          panelRef.current?.contains(e.target as Node) ||
          buttonRef.current?.contains(e.target as Node)
        ) return;
        setOptionsOpen(false);
      }
      if (aboutOpen) {
        if (
          aboutPanelRef.current?.contains(e.target as Node) ||
          aboutButtonRef.current?.contains(e.target as Node)
        ) return;
        setAboutOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [optionsOpen, aboutOpen]);

  const openModel = useCallback((model: Model) => {
    setSelectedModel(model);
    setClosingModal(false);
    window.location.hash = model.id;
  }, []);

  const startClosing = useCallback(() => {
    setClosingModal(true);
  }, []);

  const closeModel = useCallback(() => {
    setSelectedModel(null);
    setClosingModal(false);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  // Hash routing — open modal on load if hash present
  useEffect(() => {
    function openFromHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const model = models.find((m) => m.id === hash);
      if (!model) return;
      setSelectedModel(model);
      setClosingModal(false);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  // Scroll lock when modal open
  useEffect(() => {
    if (selectedModel) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedModel]);

  const filtered = models.filter(
    (m) =>
      overallScore(m) >= minScore &&
      bestSpeed(m) >= minSpeedVal &&
      (!requireVision || m.supportsImages) &&
      (!requireOpenWeights || m.openWeights)
  );

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      if (sortAsc) {
        // third click: reset
        setSortCol(null);
      } else {
        setSortAsc(true);
      }
    } else {
      setSortCol(col as typeof sortCol);
      setSortAsc(false);
    }
  };

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (sortCol) {
          case "model": cmp = a.name.localeCompare(b.name); break;
          case "creator": cmp = (getLab(a.labId)?.name ?? "").localeCompare(getLab(b.labId)?.name ?? ""); break;
          case "score": cmp = overallScore(a) - overallScore(b); break;
          case "cost": cmp = bestCost(a) - bestCost(b); break;
          case "speed": cmp = bestSpeed(a) - bestSpeed(b); break;
          case "released": cmp = a.releaseDate.localeCompare(b.releaseDate); break;
        }
        return sortAsc ? cmp : -cmp;
      })
    : [...filtered].sort((a, b) => overallScore(b) - overallScore(a));

  const searched = searchQuery
    ? sorted.filter((m) => {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || (getLab(m.labId)?.name ?? "").toLowerCase().includes(q);
      })
    : sorted;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "color-mix(in srgb, var(--background) 60%, transparent)",
          opacity: optionsOpen || aboutOpen ? 1 : 0,
          pointerEvents: optionsOpen || aboutOpen ? "auto" : "none",
          transition: `opacity 0.3s ${EASING}`,
        }}
        onClick={() => { setOptionsOpen(false); setAboutOpen(false); }}
      />

      {/* Options panel */}
      <div
        ref={panelRef}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          pointerEvents: optionsOpen ? "auto" : "none",
        }}
        onClick={() => setOptionsOpen(false)}
      >
        <div
          className="rounded-3xl px-8 pt-14 pb-8"
          style={{
            background: "var(--card-bg)",
            opacity: optionsOpen ? 1 : 0,
            transform: optionsOpen ? "scale(1)" : "scale(0.9)",
            pointerEvents: optionsOpen ? "auto" : "none",
            transition: optionsOpen
              ? "opacity 0.3s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : `opacity 0.2s ease, transform 0.2s ${EASING}`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-6" style={{ minHeight: 164 }}>
            <MinScoreSlider value={minScore} onChange={setMinScore} empty={filtered.length === 0} />
            <MinScoreSlider value={minSpeedVal} onChange={setMinSpeedVal} min={0} max={300} empty={filtered.length === 0} label="Minimum Best Speed" unit="tok/s" />
            <div className="flex gap-3">
              <FilterPill label={requireVision ? "Only Vision" : "Vision"} active={requireVision} color="magenta" onClick={() => setRequireVision((v) => !v)} icon={<EyeIcon />} />
              <FilterPill label={requireOpenWeights ? "Only Open" : "Open Weights"} active={requireOpenWeights} color="green" onClick={() => setRequireOpenWeights((v) => !v)} icon={<UnlockedIcon />} />
            </div>
            <div
              style={{
                opacity: minScore !== 70 || minSpeedVal !== 0 || requireVision || requireOpenWeights ? 1 : 0,
                transition: `opacity 0.25s ${EASING}`,
                pointerEvents: minScore !== 70 || minSpeedVal !== 0 || requireVision || requireOpenWeights ? "auto" : "none",
              }}
            >
              <button
                onClick={() => { setMinScore(70); setMinSpeedVal(0); setRequireVision(false); setRequireOpenWeights(false); }}
                className="text-sm font-medium text-sys-red hover:bg-sys-red/10 active:bg-sys-red active:text-[var(--card-bg)] transition-colors cursor-pointer h-[44px] px-6 rounded-full"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About panel */}
      <div
        ref={aboutPanelRef}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          pointerEvents: aboutOpen ? "auto" : "none",
        }}
        onClick={() => setAboutOpen(false)}
      >
        <div
          className="rounded-3xl px-8 py-10 max-w-[420px] text-center"
          style={{
            background: "var(--card-bg)",
            opacity: aboutOpen ? 1 : 0,
            transform: aboutOpen ? "scale(1)" : "scale(0.9)",
            pointerEvents: aboutOpen ? "auto" : "none",
            transition: aboutOpen
              ? "opacity 0.3s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : `opacity 0.2s ease, transform 0.2s ${EASING}`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4 text-sm text-foreground-secondary leading-relaxed">
            <p>
              <span className="font-semibold text-foreground mb-1 block">Methodology</span>
              Intelligence scores are averaged from coding (<a href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">SWE-Bench Verified</a>), reasoning (<a href="https://huggingface.co/datasets/Idavidrein/gpqa" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">GPQA Diamond</a>), math (<a href="https://artofproblemsolving.com/wiki/index.php/2025_AIME" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">AIME 2025</a>), and general knowledge (<a href="https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">MMLU-Pro</a>) benchmarks. Speed and cost reflect best available provider pricing.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Sources</span>
              <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Artificial Analysis</a>, <a href="https://lmarena.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Chatbot Arena</a>, and provider documentation.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Built with</span>
              <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Next.js</a>, <a href="https://airbnb.io/visx" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">visx</a>, <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Tailwind CSS</a>, and <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Vercel</a>.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Created by</span>
              <a href="https://x.com/davidhariri" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-foreground/20"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>@davidhariri</a>
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/davidhariri/model-finder/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-sys-red hover:bg-sys-red/10 active:bg-sys-red active:text-[var(--card-bg)] transition-colors cursor-pointer h-[44px] px-6 rounded-full inline-flex items-center"
              >
                Report an Issue
              </a>
            </div>
            <p className="text-foreground-tertiary pt-1">
              Last updated February 20, 2026
            </p>
          </div>
        </div>
      </div>

    <main className="mx-auto max-w-5xl px-6 pt-8 pb-16 md:pt-12 md:pb-24">
      {/* Hero */}
      <header className="mb-20 text-center">
        <div className="mb-6 flex items-center justify-center gap-1">
          <button
            ref={buttonRef}
            onClick={() => { setOptionsOpen((o) => !o); setAboutOpen(false); }}
            className={`text-sm font-semibold tracking-tight cursor-pointer rounded-full px-5 py-2 transition-colors duration-200 ${
              (() => {
                const count = (minScore !== 70 ? 1 : 0) + (minSpeedVal !== 0 ? 1 : 0) + (requireVision ? 1 : 0) + (requireOpenWeights ? 1 : 0);
                return count > 0
                  ? "text-accent"
                  : optionsOpen
                    ? "text-foreground"
                    : "text-foreground-tertiary hover:text-foreground-secondary";
              })()
            }`}
          >
            {(() => {
              const count = (minScore !== 70 ? 1 : 0) + (minSpeedVal !== 0 ? 1 : 0) + (requireVision ? 1 : 0) + (requireOpenWeights ? 1 : 0);
              return count > 0 ? `${count} Option${count > 1 ? "s" : ""} Applied` : "Options";
            })()}
          </button>
          <button
            ref={aboutButtonRef}
            onClick={() => { setAboutOpen((o) => !o); setOptionsOpen(false); }}
            className={`text-sm font-semibold tracking-tight cursor-pointer rounded-full px-5 py-2 transition-colors duration-200 ${
              aboutOpen
                ? "text-foreground"
                : "text-foreground-tertiary hover:text-foreground-secondary"
            }`}
          >
            About
          </button>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Cloud Model Finder
        </h1>
      </header>

      {/* Intelligence by Cost/Speed scatter */}
      <section className="mb-24">
        <CostPerformanceScatter models={filtered} onModelClick={openModel} onAboutClick={() => { setAboutOpen(true); setOptionsOpen(false); }} />
      </section>

      {/* Rankings — tabbed Intelligence / Speed / Cost */}
      <section className="mb-24">
        <RankingTabs models={filtered} minScore={minScore} onModelClick={openModel} onAboutClick={() => { setAboutOpen(true); setOptionsOpen(false); }} />
      </section>

      {/* All Models table */}
      <section className="mb-24">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground text-center mb-4">
          All Models
        </h2>
        <div className="flex justify-center mb-6">
          <div className="relative" style={{ transition: "opacity 0.3s ease" }}>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-tertiary pointer-events-none" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search"
              className={`text-sm text-foreground bg-transparent border border-[var(--card-border)] rounded-full pl-9 ${searchQuery ? "pr-8" : "pr-4"} py-2 outline-none transition-all duration-300 w-48 focus:w-72 placeholder:text-foreground-tertiary focus:border-[var(--foreground-tertiary)]`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground cursor-pointer"
                style={{ opacity: searchFocused ? 0 : 1, pointerEvents: searchFocused ? "none" : "auto", transition: "opacity 0.2s ease" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
              <SortTh col="model" current={sortCol} asc={sortAsc} onSort={toggleSort} align="left" className="pl-4">Model</SortTh>
              <SortTh col="released" current={sortCol} asc={sortAsc} onSort={toggleSort} align="left">Released</SortTh>
              <SortTh col="creator" current={sortCol} asc={sortAsc} onSort={toggleSort} align="left">Creator</SortTh>
              <SortTh col="score" current={sortCol} asc={sortAsc} onSort={toggleSort} align="right">Intelligence</SortTh>
              <SortTh col="cost" current={sortCol} asc={sortAsc} onSort={toggleSort} align="right">Cost</SortTh>
              <SortTh col="speed" current={sortCol} asc={sortAsc} onSort={toggleSort} align="right" className="pr-4">Speed</SortTh>
            </tr>
          </thead>
          <tbody>
            {searched.map((model, i) => {
              const lab = getLab(model.labId);
              const isLast = i === searched.length - 1;
              return (
                <tr
                  key={model.id}
                  onClick={() => openModel(model)}
                  className="cursor-pointer hover:bg-surface transition-colors"
                  style={isLast ? undefined : { borderBottom: "1px solid var(--card-border)" }}
                >
                  <td className="py-3 pr-3 pl-4 font-medium text-foreground">
                    {model.name}
                  </td>
                  <td className="py-3 pr-3 text-foreground-secondary">
                    {formatMonthYear(model.releaseDate)}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-1.5 text-foreground-secondary">
                      <BrandIcon id={model.labId} size={14} className="shrink-0" />
                      {lab?.name}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium text-foreground">{overallScore(model)}</td>
                  <td className="py-3 text-right font-medium text-foreground">${bestCost(model).toFixed(2)}</td>
                  <td className="py-3 pr-4 text-right font-medium text-foreground">
                    {bestSpeed(model)}
                    <span className="text-[12px] font-normal text-foreground-tertiary ml-0.5">tok/s</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

    </main>

      {/* Model detail backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{
          background: "color-mix(in srgb, var(--background) 80%, transparent)",
          opacity: selectedModel && !closingModal ? 1 : 0,
          pointerEvents: selectedModel && !closingModal ? "auto" : "none",
          transition: `opacity 0.3s ${EASING}`,
        }}
      />

      {/* Model detail modal */}
      {selectedModel && (
        <ModelDetail
          model={selectedModel}
          onClose={closeModel}
          onCloseStart={startClosing}
        />
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-24">
      <h2 className={`text-2xl font-semibold tracking-tight text-foreground text-center ${subtitle ? "" : "mb-8"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-foreground-tertiary mb-8 text-center">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function SortTh<T extends string>({ col, current, asc, onSort, align, children, className }: {
  col: T;
  current: T | null;
  asc: boolean;
  onSort: (col: T) => void;
  align: "left" | "right";
  children: React.ReactNode;
  className?: string;
}) {
  const active = current === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-${align} text-[12px] font-medium pb-2 cursor-pointer select-none transition-colors ${
        active ? "text-foreground" : "text-foreground-tertiary hover:text-foreground-secondary"
      } ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function FilterPill({ label, active, color, icon, onClick }: { label: string; active: boolean; color?: "green" | "magenta"; icon?: React.ReactNode; onClick: () => void }) {
  const activeClasses = color === "green"
    ? "bg-sys-green text-[var(--card-bg)]"
    : color === "magenta"
      ? "bg-sys-pink text-[var(--card-bg)]"
      : "bg-foreground text-background";
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium cursor-pointer h-[44px] px-5 rounded-full transition-colors duration-200 flex items-center gap-1.5 ${
        active
          ? activeClasses
          : "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground-secondary hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EyeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function LockedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function UnlockedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7.5" width="8" height="6" rx="1.5" />
      <path d="M5.5 7.5V4.5a2.5 2.5 0 0 1 5 0v0" />
    </svg>
  );
}
