"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Model, models, providers, overallScore, bestSpeed, bestCost, getLab, getProvider } from "@/data/models";
import CostPerformanceScatter from "@/components/CostPerformanceScatter";
import RankingTabs from "@/components/RankingTabs";
import ModelDetail from "@/components/ModelDetail";
import MinScoreSlider from "@/components/MinScoreSlider";
import BrandIcon from "@/components/BrandIcon";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function Home() {
  const [minScore, setMinScore] = useState(50);
  const [minSpeedVal, setMinSpeedVal] = useState(100);
  const [maxCostVal, setMaxCostVal] = useState(20);
  const [requireVision, setRequireVision] = useState(false);
  const [requireOpenWeights, setRequireOpenWeights] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [closingModal, setClosingModal] = useState(false);
  const [sortCol, setSortCol] = useState<"model" | "creator" | "score" | "cost" | "speed" | "released" | null>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const aboutPanelRef = useRef<HTMLDivElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aboutOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        aboutPanelRef.current?.contains(e.target as Node) ||
        aboutButtonRef.current?.contains(e.target as Node)
      ) return;
      setAboutOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [aboutOpen]);

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

  const filtersChanged = minScore !== 0 || minSpeedVal !== 0 || maxCostVal !== 50 || requireVision || requireOpenWeights || selectedProviderId !== null;

  const filtered = models.filter(
    (m) =>
      overallScore(m) >= minScore &&
      bestSpeed(m) >= minSpeedVal &&
      (maxCostVal >= 50 || bestCost(m) <= maxCostVal) &&
      (!requireVision || m.supportsImages) &&
      (!requireOpenWeights || m.openWeights) &&
      (!selectedProviderId || m.providers.some((p) => p.providerId === selectedProviderId))
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
          opacity: aboutOpen ? 1 : 0,
          pointerEvents: aboutOpen ? "auto" : "none",
          transition: `opacity 0.3s ${EASING}`,
        }}
        onClick={() => setAboutOpen(false)}
      />

      {/* About panel */}
      <div
        ref={aboutPanelRef}
        className="fixed inset-0 z-50 flex items-center justify-center md:items-center"
        style={{
          pointerEvents: aboutOpen ? "auto" : "none",
        }}
        onClick={() => setAboutOpen(false)}
      >
        <div
          className="md:rounded-3xl px-5 py-8 pb-5 md:px-8 md:py-10 md:pb-8 md:max-w-[480px] w-full h-full md:h-[calc(100vh-64px)] md:w-auto overflow-y-auto"
          style={{
            background: "var(--card-bg)",
            opacity: aboutOpen ? 1 : 0,
            transform: aboutOpen ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
            pointerEvents: aboutOpen ? "auto" : "none",
            transition: aboutOpen
              ? `opacity 0.3s ease, transform 0.45s ${EASING}`
              : `opacity 0.2s ease, transform 0.2s ${EASING}`,
            boxShadow: "0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)",
            scrollbarWidth: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header + close button — mobile only */}
          <div className="md:hidden flex items-start justify-between mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">About</h2>
            <button
              onClick={() => setAboutOpen(false)}
              className="text-foreground-tertiary hover:text-foreground transition-colors cursor-pointer p-2 -mt-1 -mr-2"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M7 7l14 14M21 7L7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="space-y-4 text-sm text-foreground-secondary leading-relaxed text-left">
            <p>
              <span className="font-semibold text-foreground mb-1 block">Intelligence Score</span>
              Each benchmark is normalized to 0–1 using fixed goalposts (random-chance floor to near-mastery ceiling), then averaged equally and scaled to 0–100. Benchmarks included in the composite:
            </p>
            <table className="w-full text-[13px]">
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td className="py-2.5 text-foreground font-medium">Coding</td>
                  <td className="py-2.5 text-right"><a href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">SWE-Bench Verified</a>, <a href="https://livecodebench.github.io" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">LiveCodeBench</a></td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td className="py-2.5 text-foreground font-medium">Reasoning</td>
                  <td className="py-2.5 text-right"><a href="https://huggingface.co/datasets/Idavidrein/gpqa" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">GPQA Diamond</a>, <a href="https://agi.safe.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">HLE</a></td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td className="py-2.5 text-foreground font-medium">Math</td>
                  <td className="py-2.5 text-right"><a href="https://artofproblemsolving.com/wiki/index.php/2025_AIME" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">AIME 2025</a>, <a href="https://artofproblemsolving.com/wiki/index.php/2026_AIME" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">AIME 2026</a></td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td className="py-2.5 text-foreground font-medium">General</td>
                  <td className="py-2.5 text-right"><a href="https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">MMLU-Pro</a></td>
                </tr>
              </tbody>
            </table>
            <p>
              Not all models have all benchmarks — the score averages whichever are available. <a href="https://mmmu-benchmark.github.io" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">MMMU-Pro</a> (multimodal) and <a href="https://lmarena.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Chatbot Arena Elo</a> are shown in model details but excluded from the composite. Speed and cost reflect best available provider.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Blended Cost</span>
              Cost is shown as a weighted average of input and output token prices: (3 × input + 1 × output) ÷ 4. This reflects typical usage where prompts are longer than completions. Where a model is available from multiple providers, the lowest blended cost is used.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Sources</span>
              <a href="https://artificialanalysis.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Artificial Analysis</a>, <a href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">SWE-bench</a>, <a href="https://matharena.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">MathArena</a>, <a href="https://lmarena.ai" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Chatbot Arena</a>, and provider documentation.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Built with</span>
              <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Next.js</a>, <a href="https://airbnb.io/visx" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">visx</a>, <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Tailwind CSS</a>, and <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline decoration-foreground/20">Vercel</a>.
            </p>
            <p>
              <span className="font-semibold text-foreground mb-1 block">Created by</span>
              <a href="https://x.com/davidhariri" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-foreground/20"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>@davidhariri</a>
            </p>
          </div>
        </div>
      </div>

    <main className="mx-auto max-w-5xl px-4 md:px-6 pt-8 pb-16 md:pt-12 md:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Model Browser",
          "url": "https://models.dhariri.com",
          "description": "Compare LLM models by intelligence benchmarks, API pricing, and speed. Filter and sort GPT, Claude, Gemini, Llama, and more.",
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "Any",
          "offers": { "@type": "Offer", "price": "0" },
          "author": { "@type": "Person", "name": "David Hariri", "url": "https://dhariri.com" },
        }) }}
      />
      {/* Hero + Inline Filters */}
      <header className="mb-10 md:mb-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl mb-8 md:mb-10">
          Model Browser
        </h1>
        <p className="sr-only">
          Compare large language models side by side. Filter GPT-4o, Claude, Gemini, Llama, Mistral, DeepSeek, and Qwen models by intelligence benchmarks like GPQA Diamond, SWE-Bench, and MMLU-Pro. Sort by API pricing, tokens per second, and overall score. Find the best LLM for your use case.
        </p>
        <div className="flex flex-col items-center gap-5 max-w-3xl mx-auto">
          {/* Sliders: stacked on mobile, 3-col on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
            <MinScoreSlider value={minScore} onChange={setMinScore} />
            <div className="hidden md:block">
              <MinScoreSlider value={minSpeedVal} onChange={setMinSpeedVal} min={0} max={500} label="Minimum Best Speed" unit="tok/s" />
            </div>
            <MinScoreSlider value={maxCostVal} onChange={setMaxCostVal} min={1} max={50} label="Maximum Blended Cost" prefix="$" unit="/1M" />
          </div>
          {/* Pills + Provider dropdown */}
          <div className="flex gap-3 items-center flex-wrap justify-center">
            <FilterPill label="Only Vision" active={requireVision} color="magenta" onClick={() => setRequireVision((v) => !v)} icon={<EyeIcon />} />
            <FilterPill label="Only Open Weights" active={requireOpenWeights} color="green" onClick={() => setRequireOpenWeights((v) => !v)} icon={<UnlockedIcon />} />
            <ProviderDropdown selectedProviderId={selectedProviderId} onChange={setSelectedProviderId} />
          </div>
          {/* Empty state + Reset */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-sm font-medium text-center"
              style={{
                color: "#f59e0b",
                opacity: filtered.length === 0 ? 1 : 0,
                height: filtered.length === 0 ? "auto" : 0,
                overflow: "hidden",
                transition: "opacity 0.3s ease",
              }}
            >
              No possible models
            </div>
            <button
              onClick={() => {
                setMinScore(0);
                setMinSpeedVal(0);
                setMaxCostVal(50);
                setRequireVision(false);
                setRequireOpenWeights(false);
                setSelectedProviderId(null);
              }}
              className="text-sm font-medium cursor-pointer transition-all duration-300 hover:opacity-100!"
              style={{
                color: "var(--foreground-tertiary)",
                opacity: filtersChanged ? 0.4 : 0,
                pointerEvents: filtersChanged ? "auto" : "none",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Intelligence by Cost/Speed scatter */}
      <section className="mb-16 md:mb-24">
        <CostPerformanceScatter models={filtered} onModelClick={openModel} onAboutClick={() => setAboutOpen(true)} />
      </section>

      {/* Rankings — tabbed Intelligence / Speed / Cost */}
      <section className="mb-16 md:mb-24">
        <RankingTabs models={filtered} minScore={minScore} onModelClick={openModel} onAboutClick={() => setAboutOpen(true)} />
      </section>

      {/* All Models table */}
      <section className="mb-16 md:mb-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground text-center md:text-left">
          All Models
        </h2>
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
              className={`text-sm text-foreground bg-transparent border border-[var(--card-border)] rounded-full pl-9 ${searchQuery ? "pr-8" : "pr-4"} py-2 outline-none transition-all duration-300 w-full md:w-48 md:focus:w-72 placeholder:text-foreground-tertiary focus:border-[var(--foreground-tertiary)]`}
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
              <SortTh col="released" current={sortCol} asc={sortAsc} onSort={toggleSort} align="left" className="hidden md:table-cell">Released</SortTh>
              <SortTh col="creator" current={sortCol} asc={sortAsc} onSort={toggleSort} align="left" className="hidden md:table-cell">Creator</SortTh>
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
                    <span className="flex items-center gap-1.5">
                      <BrandIcon id={model.labId} size={14} className="shrink-0 md:hidden" />
                      {model.name}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-foreground-secondary hidden md:table-cell">
                    {formatMonthYear(model.releaseDate)}
                  </td>
                  <td className="py-3 pr-3 hidden md:table-cell">
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

      {/* Footer */}
      <footer className="text-center pb-12 space-y-4">
        <button
          ref={aboutButtonRef}
          onClick={() => setAboutOpen(true)}
          className="text-sm font-medium text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer underline decoration-foreground/20"
        >
          About
        </button>
        <p className="text-sm font-medium text-foreground-tertiary">Last updated February 22, 2026</p>
        <p className="text-sm font-medium text-foreground-tertiary">
          <a href="https://x.com/davidhariri" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-foreground/20 hover:text-foreground-secondary transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>@davidhariri</a>
        </p>
      </footer>

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

function ProviderDropdown({ selectedProviderId, onChange }: { selectedProviderId: string | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = selectedProviderId !== null;
  const selectedProvider = selectedProviderId ? getProvider(selectedProviderId) : null;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  // Only show providers that have models
  const providerIds = new Set(models.flatMap((m) => m.providers.map((p) => p.providerId)));
  const availableProviders = providers.filter((p) => providerIds.has(p.id));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-sm font-medium cursor-pointer h-[44px] px-5 rounded-full transition-colors duration-200 flex items-center gap-1.5 ${
          active
            ? "bg-foreground text-background"
            : "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-foreground-secondary hover:text-foreground"
        }`}
      >
        {selectedProviderId && <BrandIcon id={selectedProviderId} size={14} />}
        {selectedProvider?.name ?? "All Providers"}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-0.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <path d="M2.5 4L5 6.5L7.5 4" />
        </svg>
      </button>
      <div
        className="absolute top-full left-0 mt-2 rounded-2xl py-1.5 z-50 min-w-[220px]"
        style={{
          background: "var(--card-bg)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid var(--card-border)",
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(0.95)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.15s ease, transform 0.15s ease",
        }}
      >
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className={`w-full text-left text-sm px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
            !selectedProviderId ? "text-foreground font-medium" : "text-foreground-secondary hover:text-foreground"
          }`}
        >
          All Providers
        </button>
        {availableProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => { onChange(provider.id); setOpen(false); }}
            className={`w-full text-left text-sm px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
              selectedProviderId === provider.id ? "text-foreground font-medium" : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            <BrandIcon id={provider.id} size={14} className="shrink-0" />
            {provider.name}
          </button>
        ))}
      </div>
    </div>
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
