"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Model, bestCost, bestSpeed, blendedCost, formatContext, formatParams, getLab, getProvider, overallScore } from "@/data/models";
import BrandIcon, { ICONS, PROVIDER_ALIAS } from "./BrandIcon";

type Phase = "enter" | "open" | "closing";

interface ModelDetailProps {
  model: Model;
  onClose: () => void;
  onCloseStart: () => void;
}

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

// Chart-consistent highlight colors

type Tile = "intelligence" | "speed" | "cost";

export default function ModelDetail({
  model,
  onClose,
  onCloseStart,
}: ModelDetailProps) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [selectedTile, setSelectedTile] = useState<Tile>("intelligence");
  const [tileTransitioning, setTileTransitioning] = useState(false);
  const [tileSlideDir, setTileSlideDir] = useState<"left" | "right">("right");
  const [provSortCol, setProvSortCol] = useState<"provider" | "input" | "output" | "blended" | "speed" | null>("blended");
  const [provSortAsc, setProvSortAsc] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const TILES: Tile[] = ["intelligence", "speed", "cost"];
  const switchTile = useCallback(
    (next: Tile) => {
      if (next === selectedTile) return;
      const dir = TILES.indexOf(next) > TILES.indexOf(selectedTile) ? "right" : "left";
      setTileSlideDir(dir);
      setTileTransitioning(true);
      setTimeout(() => {
        setSelectedTile(next);
        setTileSlideDir(dir === "right" ? "left" : "right");
        requestAnimationFrame(() => {
          setTileTransitioning(false);
        });
      }, 200);
    },
    [selectedTile]
  );

  // Enter -> open on next frame
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function handleClose() {
    if (phase === "closing") return;
    onCloseStart();
    setPhase("closing");
    setTimeout(onClose, 300);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  }

  const lab = getLab(model.labId);
  const score = overallScore(model);

  const speedProviders = [...model.providers].sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);
  const costProviders = [...model.providers].sort((a, b) => blendedCost(a) - blendedCost(b));
  const maxSpeed = Math.max(...model.providers.map((p) => p.tokensPerSecond));
  const maxCostVal = Math.max(...model.providers.map((p) => Math.max(p.costPer1MInput, p.costPer1MOutput)));

  const barData: { label: string; pct: number; display: string; providerId?: string; costType?: "input" | "output" }[] =
    selectedTile === "intelligence"
      ? [
          ...(model.scores.coding != null ? [{ label: "Coding (SWE-Bench)", pct: model.scores.coding, display: model.scores.coding.toString() }] : []),
          ...(model.scores.codingLive != null ? [{ label: "Coding (LiveCode)", pct: model.scores.codingLive, display: model.scores.codingLive.toString() }] : []),
          { label: "Reasoning (GPQA)", pct: model.scores.reasoning, display: model.scores.reasoning.toString() },
          ...(model.scores.reasoningHle != null ? [{ label: "Reasoning (HLE)", pct: model.scores.reasoningHle, display: model.scores.reasoningHle.toString() }] : []),
          ...(model.scores.math != null ? [{ label: `Math (${model.scores.mathBenchmark})`, pct: model.scores.math, display: model.scores.math.toString() }] : []),
          ...(model.scores.general != null ? [{ label: "General (MMLU-Pro)", pct: model.scores.general, display: model.scores.general.toString() }] : []),
          ...(model.scores.multimodal != null ? [{ label: "Multimodal (MMMU-Pro)", pct: model.scores.multimodal, display: model.scores.multimodal.toString() }] : []),
          ...(model.scores.elo != null ? [{ label: "Human Pref (Elo)", pct: Math.min(100, ((model.scores.elo - 800) / 600) * 100), display: model.scores.elo.toString() }] : []),
        ]
      : selectedTile === "speed"
        ? speedProviders.map((p) => ({
            label: getProvider(p.providerId)?.name ?? p.providerId,
            pct: (p.tokensPerSecond / maxSpeed) * 100,
            display: `${p.tokensPerSecond} tok/s`,
            providerId: p.providerId,
          }))
        : costProviders.flatMap((p) => {
            const name = getProvider(p.providerId)?.name ?? p.providerId;
            return [
              { label: `${name} — Input`, pct: (p.costPer1MInput / maxCostVal) * 100, display: `$${fmtCost(p.costPer1MInput)}`, providerId: p.providerId, costType: "input" as const },
              { label: `${name} — Output`, pct: (p.costPer1MOutput / maxCostVal) * 100, display: `$${fmtCost(p.costPer1MOutput)}`, providerId: p.providerId, costType: "output" as const },
            ];
          });

  const barGradient = (costType?: "input" | "output") =>
    selectedTile === "intelligence"
      ? "linear-gradient(90deg, var(--bar-fill-start), var(--bar-fill-end))"
      : selectedTile === "speed"
        ? "linear-gradient(90deg, var(--speed-bar-start), var(--speed-bar-end))"
        : costType === "output"
          ? "linear-gradient(90deg, var(--cost-bar-output-start, var(--cost-bar-start)), var(--cost-bar-output-end, var(--cost-bar-end)))"
          : "linear-gradient(90deg, var(--cost-bar-start), var(--cost-bar-end))";


  function toggleProvSort(col: string) {
    if (provSortCol === col) {
      if (provSortAsc) {
        setProvSortCol(null);
      } else {
        setProvSortAsc(true);
      }
    } else {
      setProvSortCol(col as typeof provSortCol);
      setProvSortAsc(false);
    }
  }

  const sortedProviders = provSortCol
    ? [...model.providers].sort((a, b) => {
        let cmp = 0;
        switch (provSortCol) {
          case "provider": cmp = (getProvider(a.providerId)?.name ?? "").localeCompare(getProvider(b.providerId)?.name ?? ""); break;
          case "input": cmp = a.costPer1MInput - b.costPer1MInput; break;
          case "output": cmp = a.costPer1MOutput - b.costPer1MOutput; break;
          case "blended": cmp = blendedCost(a) - blendedCost(b); break;
          case "speed": cmp = a.tokensPerSecond - b.tokensPerSecond; break;
        }
        return provSortAsc ? cmp : -cmp;
      })
    : [...model.providers];

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const modalWidth = isMobile ? window.innerWidth : Math.min(720, window.innerWidth - 48);
  const targetLeft = isMobile ? 0 : (window.innerWidth - modalWidth) / 2;

  const isOpen = phase === "open";
  const isClosing = phase === "closing";
  const visible = isOpen && !isClosing;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="fixed inset-0 z-[65]" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        style={{
          position: "fixed",
          zIndex: 70,
          top: isMobile ? 0 : 32,
          left: targetLeft,
          width: modalWidth,
          height: isMobile ? "100vh" : "calc(100vh - 64px)",
          borderRadius: isMobile ? 0 : 32,
          background: "var(--card-bg)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          transition: isClosing
            ? "opacity 0.25s ease, transform 0.25s ease"
            : `opacity 0.35s ${EASING}, transform 0.45s ${EASING}`,
        }}
      >
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 px-4 sm:px-6 pt-8 pb-14 overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, var(--card-bg) 50%, color-mix(in srgb, var(--card-bg) 50%, transparent) 80%, transparent)",
            borderRadius: isMobile ? 0 : "32px 32px 0 0",
          }}
        >
          {/* Monogram: continuous gradient masked by tiled icon shapes */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              borderRadius: isMobile ? 0 : "32px 32px 0 0",
              maskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 70%)",
            }}
          >
            {(() => {
              const resolvedId = PROVIDER_ALIAS[model.labId] || model.labId;
              const icon = ICONS[resolvedId];
              if (!icon) return null;
              const size = 40;
              const stepX = 58;
              const stepY = 52;
              const cols = Math.ceil(1600 / stepX) + 1;
              const rows = Math.ceil(600 / stepY) + 1;
              const vbParts = icon.viewBox.split(" ").map(Number);
              const vbW = vbParts[2] - vbParts[0];
              const vbH = vbParts[3] - vbParts[1];
              const svgW = cols * stepX + stepX;
              const svgH = rows * stepY + stepY;
              let pathsStr = "";
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  const x = c * stepX;
                  const y = r * stepY + (c % 2 === 1 ? stepY * 0.5 : 0);
                  const scaleX = size / vbW;
                  const scaleY = size / vbH;
                  for (const p of icon.paths) {
                    pathsStr += `<path d="${p.d}" transform="translate(${x},${y}) scale(${scaleX},${scaleY})"${p.opacity != null ? ` opacity="${p.opacity}"` : ""}/>`;
                  }
                }
              }
              const svgMask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${svgW}' height='${svgH}'><g fill='white' fill-rule='evenodd'>${pathsStr}</g></svg>`)}")`;
              return (
                <div
                  style={{
                    position: "absolute",
                    inset: "-50%",
                    width: "200%",
                    height: "200%",
                    transform: "rotate(-15deg)",
                    transformOrigin: "center center",
                    background: "linear-gradient(135deg, #34d399 0%, #22d3ee 20%, #818cf8 40%, #a78bfa 60%, #c084fc 80%, #34d399 100%)",
                    backgroundSize: "300% 300%",
                    animation: "holographic-shimmer 12s ease-in-out infinite",
                    opacity: 0.08,
                    maskImage: svgMask,
                    WebkitMaskImage: svgMask,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
              );
            })()}
          </div>
          <div className="flex items-start justify-between relative">
            <div>
              <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">{model.name}</h2>
              <p className="text-[15px] text-foreground-secondary flex items-center gap-1.5 mt-1">
                Created by
                <a
                  href={lab?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-accent transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BrandIcon id={model.labId} size={16} />
                  {lab?.name}
                </a>
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-foreground-tertiary hover:text-foreground transition-colors cursor-pointer -mt-1 -mr-1 p-2"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M7 7l14 14M21 7L7 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-40">
          {/* Key specs */}
          <div className="mt-6 mb-8 grid grid-cols-3 gap-3">
            <SpecTile
              label="Intelligence"
              value={score.toString()}
              desc="Blended score"
              selected={selectedTile === "intelligence"}
              onClick={() => switchTile("intelligence")}
            />
            <SpecTile
              label="Best Speed"
              value={`${bestSpeed(model)}`}
              desc="Tokens per second"
              selected={selectedTile === "speed"}
              onClick={() => switchTile("speed")}
            />
            <SpecTile
              label="Lowest Blended Cost"
              value={`$${fmtCost(bestCost(model))}`}
              desc="Per 1M tokens"
              selected={selectedTile === "cost"}
              onClick={() => switchTile("cost")}
            />
          </div>

          {/* Breakdown bars */}
          <div
            style={{
              minHeight: Math.max(4, model.providers.length) * 30,
              transform: "translateX(0)",
              opacity: tileTransitioning ? 0 : 1,
              transition: `transform 0.35s ${EASING}, opacity 0.2s ease`,
            }}
          >
          <div className="space-y-3 sm:space-y-2">
            {barData.map((s) => (
              <div key={s.label}>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:flex text-[13px] text-foreground-secondary w-40 shrink-0 truncate items-center gap-1.5">
                    {s.providerId && <BrandIcon id={s.providerId} size={14} className="shrink-0" />}
                    {s.label}
                  </span>
                  <div
                    className="flex-1 h-3.5 rounded-full overflow-hidden"
                    style={{ background: "var(--surface)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.pct}%`,
                        background: barGradient(s.costType),
                        transition: visible
                          ? `width 0.6s ${EASING} 0.2s`
                          : "none",
                      }}
                    />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground w-20 sm:w-24 shrink-0 text-right">
                    {s.display}
                  </span>
                </div>
                <div className="sm:hidden flex items-center gap-1 mt-1 text-[11px] text-foreground-secondary truncate">
                  {s.providerId && <BrandIcon id={s.providerId} size={12} className="shrink-0" />}
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Providers */}
          <h3 className="text-lg font-semibold tracking-tight text-foreground mt-8 mb-4">Providers</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <SortTh col="provider" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="left">Provider</SortTh>
                <SortTh col="input" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right" className="hidden sm:table-cell">Input</SortTh>
                <SortTh col="output" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right" className="hidden sm:table-cell">Output</SortTh>
                <SortTh col="blended" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right">Blended</SortTh>
                <SortTh col="speed" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right">Speed</SortTh>
              </tr>
            </thead>
            <tbody>
              {sortedProviders.map((p, i) => {
                const provider = getProvider(p.providerId);
                const isLast = i === sortedProviders.length - 1;
                return (
                  <tr
                    key={p.providerId}
                    style={isLast ? undefined : { borderBottom: "1px solid var(--card-border)" }}
                  >
                    <td className="py-3 pr-3">
                      <a
                        href={provider?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-medium text-foreground hover:text-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BrandIcon id={p.providerId} size={14} className="shrink-0" />
                        {provider?.name}
                      </a>
                    </td>
                    <td className="py-3 text-right font-medium hidden sm:table-cell">
                      ${fmtCost(p.costPer1MInput)}
                    </td>
                    <td className="py-3 text-right font-medium hidden sm:table-cell">
                      ${fmtCost(p.costPer1MOutput)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      ${fmtCost(blendedCost(p))}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {p.tokensPerSecond}
                      <span className="text-[12px] font-normal text-foreground-tertiary ml-0.5">tok/s</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Details */}
          <h3 className="text-lg font-semibold tracking-tight text-foreground mt-8 mb-4">Details</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <SpecRow label="Parameters" value={formatParams(model.parameters)} />
              <SpecRow label="Context Window" value={formatContext(model.contextWindow)} />
              <SpecRow label="Max Output" value={formatContext(model.maxOutputTokens)} />
              {model.knowledgeCutoff && <SpecRow label="Knowledge Cutoff" value={model.knowledgeCutoff} />}
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td className="py-2.5 text-foreground-secondary">Released</td>
                <td className="py-2.5 text-right font-medium text-foreground">
                  {model.releaseUrl ? (
                    <a href={model.releaseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
                      {formatDate(model.releaseDate)}
                    </a>
                  ) : formatDate(model.releaseDate)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td className="py-2.5 text-foreground-secondary">Thinking</td>
                <td className={`py-2.5 text-right font-medium ${model.thinking ? "text-sys-blue" : "text-foreground"}`}>
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    {model.thinking
                      ? model.thinking.type === "controllable"
                        ? `Controllable${model.thinking.budgetRange ? ` (${model.thinking.budgetRange})` : ""}`
                        : "Always On"
                      : "No"}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td className="py-2.5 text-foreground-secondary">Vision</td>
                <td className={`py-2.5 text-right font-medium ${model.supportsImages ? "text-sys-pink" : "text-foreground"}`}>
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    {model.supportsImages ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                    {model.supportsImages ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td className="py-2.5 text-foreground-secondary">License</td>
                <td className={`py-2.5 text-right font-medium ${model.openWeights ? "text-sys-green" : "text-foreground"}`}>
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    {model.openWeights ? <UnlockedIcon size={14} /> : <LockedIcon size={14} />}
                    {model.openWeights ? "Open Weights" : "Closed Weights"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-8 text-center">
            <a
              href="https://github.com/davidhariri/model-finder/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-sys-red hover:text-sys-red/70 active:text-sys-red/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Report an Issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fmtCost(v: number) {
  return v.toFixed(2);
}

function SpecTile({ label, value, desc, selected, onClick }: {
  label: string;
  value: string;
  desc: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-opacity duration-200"
      style={{ opacity: selected ? 1 : 0.4 }}
    >
      <p className="text-[13px] font-medium text-foreground-secondary">{label}</p>
      <p className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground leading-tight mt-0.5">
        {value}
      </p>
      <p className="text-[13px] font-medium text-foreground-secondary mt-0.5">{desc}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
      <td className="py-2.5 text-foreground-secondary">{label}</td>
      <td className="py-2.5 text-right font-medium text-foreground">{value}</td>
    </tr>
  );
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

function EyeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
      <path d="M3 13L13 3" />
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
