import { Model, bestCost, bestSpeed, getLab, overallScore } from "@/data/models";

interface ModelCardProps {
  model: Model;
}

export default function ModelCard({ model }: ModelCardProps) {
  const lab = getLab(model.labId);
  const cost = bestCost(model);
  const speed = bestSpeed(model);

  return (
    <div className="group rounded-2xl border border-card-border bg-card-bg p-5 transition-all duration-200 hover:border-card-hover-border hover:shadow-lg">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight text-foreground truncate">
          {model.name}
        </h3>
        <p className="mt-0.5 text-[13px] text-foreground-secondary">
          {lab?.name}
        </p>
        <p className="text-[11px] text-foreground-tertiary">
          {model.providers.length} provider{model.providers.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Score" value={overallScore(model).toString()} />
        <Stat
          label="Cost"
          value={`$${cost < 1 ? cost.toFixed(2) : cost.toFixed(0)}`}
          sub="/1M tok"
        />
        <Stat
          label="Speed"
          value={speed.toString()}
          sub="tok/s"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold text-foreground leading-tight">
        {value}
        {sub && (
          <span className="text-[11px] font-normal text-foreground-tertiary ml-0.5">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
