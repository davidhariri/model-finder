"use client";

import { useState } from "react";
import { models, overallScore } from "@/data/models";
import CostPerformanceScatter from "@/components/CostPerformanceScatter";
import RankingTabs from "@/components/RankingTabs";
import ModelCard from "@/components/ModelCard";
import MinScoreSlider from "@/components/MinScoreSlider";

export default function Home() {
  const [minScore, setMinScore] = useState(70);

  const filtered = models.filter((m) => overallScore(m) >= minScore);
  const sortedByScore = [...filtered].sort(
    (a, b) => overallScore(b) - overallScore(a)
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <header className="mb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Model Finder
        </h1>
        <p className="mt-3 text-lg text-foreground-secondary max-w-xl mx-auto">
          Compare model intelligence, cost, and speed.
        </p>
        <div className="mt-8">
          <MinScoreSlider value={minScore} onChange={setMinScore} empty={filtered.length === 0} />
        </div>
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
