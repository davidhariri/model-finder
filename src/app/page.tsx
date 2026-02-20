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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [closingModal, setClosingModal] = useState(false);
  const [sortCol, setSortCol] = useState<"model" | "creator" | "score" | "cost" | "speed" | "released" | null>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) return;
      setOptionsOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [optionsOpen]);

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
    (m) => overallScore(m) >= minScore && bestSpeed(m) >= minSpeedVal
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "color-mix(in srgb, var(--background) 60%, transparent)",
          opacity: optionsOpen ? 1 : 0,
          pointerEvents: optionsOpen ? "auto" : "none",
          transition: `opacity 0.3s ${EASING}`,
        }}
        onClick={() => setOptionsOpen(false)}
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
          className="rounded-3xl px-8 py-14"
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
          <div className="flex flex-col items-center gap-6">
            <MinScoreSlider value={minScore} onChange={setMinScore} empty={filtered.length === 0} />
            <MinScoreSlider value={minSpeedVal} onChange={setMinSpeedVal} min={0} max={200} empty={filtered.length === 0} label="Minimum Speed" />
          </div>
        </div>
      </div>

    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <header className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Cloud Model Finder
        </h1>
        <button
          ref={buttonRef}
          onClick={() => setOptionsOpen((o) => !o)}
          className={`mt-4 text-sm font-semibold tracking-tight cursor-pointer rounded-full px-5 py-2 transition-colors duration-200 ${
            optionsOpen
              ? "text-foreground"
              : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          Options
        </button>
      </header>

      {/* Intelligence by Cost/Speed scatter */}
      <section className="mb-24">
        <CostPerformanceScatter models={filtered} onModelClick={openModel} />
      </section>

      {/* Rankings — tabbed Intelligence / Speed / Cost */}
      <section className="mb-24">
        <RankingTabs models={filtered} minScore={minScore} onModelClick={openModel} />
      </section>

      {/* All Models table */}
      <Section title="All Models">
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
            {sorted.map((model, i) => {
              const lab = getLab(model.labId);
              const isLast = i === sorted.length - 1;
              return (
                <tr
                  key={model.id}
                  onClick={() => openModel(model)}
                  className="cursor-pointer hover:bg-surface transition-colors"
                  style={isLast ? undefined : { borderBottom: "1px solid var(--card-border)" }}
                >
                  <td className="py-3 pr-3 pl-4 font-medium text-foreground">
                    <span className="flex items-center gap-1.5">
                      {model.name}
                      {model.openWeights && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden className="shrink-0">
                          <circle cx="4" cy="4" r="4" fill="#61bb47" />
                        </svg>
                      )}
                    </span>
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
      </Section>

      <footer className="text-center text-sm text-foreground-tertiary pb-12">
        Made by <a href="https://x.com/davidhariri" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">David</a> · Last updated February 20, 2026
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
