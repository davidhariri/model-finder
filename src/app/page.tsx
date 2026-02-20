"use client";

import { useState, useEffect, useRef } from "react";
import { models, overallScore, bestSpeed } from "@/data/models";
import CostPerformanceScatter from "@/components/CostPerformanceScatter";
import RankingTabs from "@/components/RankingTabs";
import ModelCard from "@/components/ModelCard";
import MinScoreSlider from "@/components/MinScoreSlider";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function Home() {
  const [minScore, setMinScore] = useState(70);
  const [minSpeedVal, setMinSpeedVal] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
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

  const filtered = models.filter(
    (m) => overallScore(m) >= minScore && bestSpeed(m) >= minSpeedVal
  );
  const sortedByScore = [...filtered].sort(
    (a, b) => overallScore(b) - overallScore(a)
  );

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

      {/* Options button */}
      <button
        ref={buttonRef}
        onClick={() => setOptionsOpen((o) => !o)}
        className={`fixed top-6 right-6 z-30 text-sm font-semibold tracking-tight cursor-pointer rounded-full px-5 py-2 transition-colors duration-200 ${
          optionsOpen
            ? "text-foreground"
            : "text-border hover:text-foreground-tertiary"
        }`}
        style={{ background: "var(--background)" }}
      >
        Options
      </button>

      {/* Options panel */}
      <div
        ref={panelRef}
        className="fixed top-6 right-6 z-50 rounded-3xl p-14"
        style={{
          background: "var(--surface)",
          opacity: optionsOpen ? 1 : 0,
          transform: optionsOpen ? "translateY(0) scale(1)" : "translateY(-16px) scale(0.85)",
          transformOrigin: "top right",
          pointerEvents: optionsOpen ? "auto" : "none",
          transition: optionsOpen
            ? "opacity 0.3s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : `opacity 0.2s ease, transform 0.2s ${EASING}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex flex-col items-center gap-6">
          <MinScoreSlider value={minScore} onChange={setMinScore} empty={filtered.length === 0} />
          <MinScoreSlider value={minSpeedVal} onChange={setMinSpeedVal} min={0} max={200} empty={filtered.length === 0} label="Minimum Speed" />
        </div>
      </div>

    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <header className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Model Finder
        </h1>
        <p className="mt-3 text-sm text-foreground-tertiary">
          Updated February 20, 2026
        </p>
      </header>

      {/* Intelligence by Cost/Speed scatter */}
      <section className="mb-24">
        <CostPerformanceScatter models={filtered} />
      </section>

      {/* Rankings — tabbed Intelligence / Speed / Cost */}
      <section className="mb-24">
        <RankingTabs models={filtered} minScore={minScore} />
      </section>

      {/* Model Cards */}
      <Section title="All Models">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedByScore.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </Section>
    </main>
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
