import { models } from "@/data/models";
import RankingBar from "@/components/RankingBar";
import CostPerformanceScatter from "@/components/CostPerformanceScatter";
import SpeedBar from "@/components/SpeedBar";
import ModelCard from "@/components/ModelCard";

export default function Home() {
  const sortedByScore = [...models].sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <header className="mb-20">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          LLM Benchmark
        </h1>
        <p className="mt-3 text-lg text-foreground-secondary max-w-xl">
          Compare model intelligence, cost, and speed.
          Discover great models beyond the big names.
        </p>
      </header>

      {/* Cost vs Performance — most useful chart, goes first */}
      <Section
        title="Cost vs. Performance"
        subtitle="Models in the top-left offer the best value — high intelligence at low cost"
      >
        <div className="flex items-center gap-6 mb-4 ml-16">
          <Legend color="var(--accent)" label="Frontier" />
          <Legend color="#af52de" label="Mid-tier" />
          <Legend color="var(--speed-bar-start)" label="Efficient" />
        </div>
        <CostPerformanceScatter models={models} />
      </Section>

      {/* Intelligence Ranking */}
      <Section
        title="Intelligence Ranking"
        subtitle="Composite score across reasoning, coding, math, and knowledge benchmarks"
      >
        <RankingBar models={models} />
      </Section>

      {/* Speed */}
      <Section
        title="Output Speed"
        subtitle="Tokens per second — smaller models can be surprisingly fast"
      >
        <SpeedBar models={models} />
      </Section>

      {/* Model Cards */}
      <Section
        title="All Models"
        subtitle="Key stats at a glance"
      >
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
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-24">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-foreground-tertiary mb-8">{subtitle}</p>
      {children}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-foreground-tertiary">{label}</span>
    </div>
  );
}
