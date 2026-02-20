import { Model, bestCost, bestSpeed, formatContext, getLab, overallScore } from "@/data/models";
import BrandIcon from "./BrandIcon";

interface ModelCardProps {
  model: Model;
  onClick?: (model: Model) => void;
}

export default function ModelCard({ model, onClick }: ModelCardProps) {
  const lab = getLab(model.labId);
  const cost = bestCost(model);
  const speed = bestSpeed(model);

  return (
    <div
      data-model-id={model.id}
      className="group rounded-2xl p-5 transition-colors duration-200 hover:bg-surface cursor-pointer"
      onClick={() => onClick?.(model)}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight text-foreground truncate">
          {model.name}
        </h3>
        <p className="mt-0.5 text-[13px] text-foreground-secondary flex items-center gap-1.5">
          <BrandIcon id={model.labId} size={14} />
          {lab?.name}
        </p>
        <p className="text-[11px] text-foreground-tertiary">
          {formatContext(model.contextWindow)}
          {model.supportsImages && " · Vision"}
          {" · "}
          {model.providers.length} provider{model.providers.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Score" value={overallScore(model).toString()} />
        <Stat
          label="Cost"
          value={`$${cost.toFixed(2)}`}
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
