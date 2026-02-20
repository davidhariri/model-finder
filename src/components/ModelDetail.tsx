"use client";

import { useEffect, useRef, useState } from "react";
import { Model, bestCost, bestSpeed, formatContext, formatParams, getLab, getProvider, overallScore } from "@/data/models";
import BrandIcon from "./BrandIcon";

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
  const [provSortCol, setProvSortCol] = useState<"provider" | "input" | "output" | "blended" | "speed" | null>("blended");
  const [provSortAsc, setProvSortAsc] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

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
  const costProviders = [...model.providers].sort((a, b) => a.blendedCost - b.blendedCost);
  const maxSpeed = Math.max(...model.providers.map((p) => p.tokensPerSecond));
  const maxCost = Math.max(...model.providers.map((p) => p.blendedCost));

  const barData: { label: string; pct: number; display: string; providerId?: string }[] =
    selectedTile === "intelligence"
      ? [
          { label: "Coding", pct: model.scores.coding, display: model.scores.coding.toString() },
          { label: "Reasoning", pct: model.scores.reasoning, display: model.scores.reasoning.toString() },
          { label: "Math", pct: model.scores.math, display: model.scores.math.toString() },
          { label: "General", pct: model.scores.general, display: model.scores.general.toString() },
        ]
      : selectedTile === "speed"
        ? speedProviders.map((p) => ({
            label: getProvider(p.providerId)?.name ?? p.providerId,
            pct: (p.tokensPerSecond / maxSpeed) * 100,
            display: `${p.tokensPerSecond} tok/s`,
            providerId: p.providerId,
          }))
        : costProviders.map((p) => ({
            label: getProvider(p.providerId)?.name ?? p.providerId,
            pct: (p.blendedCost / maxCost) * 100,
            display: `$${fmtCost(p.blendedCost)}`,
            providerId: p.providerId,
          }));

  const barGradient =
    selectedTile === "intelligence"
      ? "linear-gradient(90deg, var(--bar-fill-start), var(--bar-fill-end))"
      : selectedTile === "speed"
        ? "linear-gradient(90deg, var(--speed-bar-start), var(--speed-bar-end))"
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
          case "blended": cmp = a.blendedCost - b.blendedCost; break;
          case "speed": cmp = a.tokensPerSecond - b.tokensPerSecond; break;
        }
        return provSortAsc ? cmp : -cmp;
      })
    : [...model.providers];

  const modalWidth = Math.min(640, window.innerWidth - 48);
  const targetLeft = (window.innerWidth - modalWidth) / 2;

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
          top: 32,
          left: targetLeft,
          width: modalWidth,
          height: "calc(100vh - 64px)",
          borderRadius: 32,
          background: "var(--card-bg)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)",
          overflowY: "auto",
          overflowX: "hidden",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          transition: isClosing
            ? "opacity 0.25s ease, transform 0.25s ease"
            : `opacity 0.35s ${EASING}, transform 0.45s ${EASING}`,
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{model.name}</h2>
              <p className="text-[15px] text-foreground-secondary flex items-center gap-1.5 mt-1">
                Created by
                <a
                  href={lab?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
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

          {/* Key specs */}
          <div className="mt-6 mb-8 grid grid-cols-3 gap-3">
            <SpecTile
              label="Intelligence"
              value={score.toString()}
              desc="Blended score"
              selected={selectedTile === "intelligence"}
              onClick={() => setSelectedTile("intelligence")}
            />
            <SpecTile
              label="Up to"
              value={`${bestSpeed(model)}`}
              desc="Tokens per second"
              selected={selectedTile === "speed"}
              onClick={() => setSelectedTile("speed")}
            />
            <SpecTile
              label="From"
              value={`$${fmtCost(bestCost(model))}`}
              desc="Per 1M tokens"
              selected={selectedTile === "cost"}
              onClick={() => setSelectedTile("cost")}
            />
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2" style={{ minHeight: Math.max(4, model.providers.length) * 30 }}>
            {barData.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[13px] text-foreground-secondary w-28 shrink-0 truncate flex items-center gap-1.5">
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
                      background: barGradient,
                      transition: visible
                        ? `width 0.6s ${EASING} 0.2s`
                        : "none",
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-foreground w-16 text-right">
                  {s.display}
                </span>
              </div>
            ))}
          </div>

          {/* Model specs */}
          <table className="w-full text-[13px] mt-8 mb-8">
            <tbody>
              <SpecRow label="Parameters" value={formatParams(model.parameters)} />
              <SpecRow label="Context Window" value={formatContext(model.contextWindow)} />
              <SpecRow label="Max Output" value={formatContext(model.maxOutputTokens)} />
              <SpecRow label="Knowledge Cutoff" value={model.knowledgeCutoff} />
              <SpecRow label="Released" value={formatDate(model.releaseDate)} />
              <tr style={{ borderTop: "1px solid var(--card-border)" }}>
                <td className="py-2.5 text-foreground-secondary">License</td>
                <td className={`py-2.5 text-right font-medium ${model.openWeights ? "text-green-600" : "text-foreground"}`}>
                  {model.openWeights ? "Open Weights" : "Closed"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Provider comparison table */}
          <div className="mt-8">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <SortTh col="provider" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="left">Provider</SortTh>
                  <SortTh col="input" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right">Input</SortTh>
                  <SortTh col="output" current={provSortCol} asc={provSortAsc} onSort={toggleProvSort} align="right">Output</SortTh>
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
                          className="flex items-center gap-1.5 font-medium text-foreground hover:text-blue-500 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <BrandIcon id={p.providerId} size={14} className="shrink-0" />
                          {provider?.name}
                        </a>
                      </td>
                      <td className="py-3 text-right font-medium" >
                        ${fmtCost(p.costPer1MInput)}
                      </td>
                      <td className="py-3 text-right font-medium" >
                        ${fmtCost(p.costPer1MOutput)}
                      </td>
                      <td className="py-3 text-right font-medium" >
                        ${fmtCost(p.blendedCost)}
                      </td>
                      <td className="py-3 text-right font-medium" >
                        {p.tokensPerSecond}
                        <span className="text-[12px] font-normal text-foreground-tertiary ml-0.5">tok/s</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      <p className="text-[12px] text-foreground-tertiary">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-foreground leading-tight mt-0.5">
        {value}
      </p>
      <p className="text-[12px] text-foreground-tertiary mt-0.5">{desc}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string; isLast?: boolean }) {
  return (
    <tr style={{ borderTop: "1px solid var(--card-border)" }}>
      <td className="py-2.5 text-foreground-secondary">{label}</td>
      <td className="py-2.5 text-right font-medium text-foreground">{value}</td>
    </tr>
  );
}

function SortTh<T extends string>({ col, current, asc, onSort, align, children }: {
  col: T;
  current: T | null;
  asc: boolean;
  onSort: (col: T) => void;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  const active = current === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-${align} text-[12px] font-medium pb-2 cursor-pointer select-none transition-colors ${
        active ? "text-foreground" : "text-foreground-tertiary hover:text-foreground-secondary"
      }`}
    >
      {children}
    </th>
  );
}

