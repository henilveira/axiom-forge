import type { ReactElement } from "react";

import { cn } from "@shared";

import type { MultiStepFormHeaderProps, MultiStepFormStep } from "@auth/types";

const PERCENT_MAX = 100;

function clampStep(currentStep: number, total: number): number {
  const lastIndex = Math.max(total - 1, 0);
  return Math.min(Math.max(currentStep, 0), lastIndex);
}

function StepCircle({
  index,
  step,
  isDone,
  isActive,
}: Readonly<{ index: number; step: MultiStepFormStep; isDone: boolean; isActive: boolean }>): ReactElement {
  return (
    <li className="flex flex-1 flex-col items-center gap-2">
      <div
        className={cn(
          "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold transition-colors",
          isDone && "border-accent bg-accent text-accent-foreground",
          isActive && "border-accent bg-background text-foreground shadow-sm",
          !isDone && !isActive && "border-muted bg-background text-muted-foreground",
        )}
        aria-current={isActive ? "step" : undefined}
      >
        {index + 1}
      </div>
      <span
        className={cn(
          "hidden text-center text-[11px] font-medium leading-tight text-muted-foreground sm:block",
          isActive && "text-foreground",
        )}
      >
        {step.title}
      </span>
    </li>
  );
}

export function MultiStepFormHeader({
  steps,
  currentStep,
  headerRight,
  className,
  shellTheme = "light",
}: Readonly<MultiStepFormHeaderProps>): ReactElement {
  const total = steps.length;
  const clamped = clampStep(currentStep, total);
  const lastIndex = Math.max(total - 1, 0);
  const progressPct = total <= 1 ? 0 : (clamped / lastIndex) * PERCENT_MAX;
  const active = steps[clamped];
  const edgeOffsetPct = PERCENT_MAX / total / 2;

  return (
    <header className={cn(shellTheme === "dark" && "dark", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Etapa <span className="font-semibold text-foreground">{clamped + 1}</span> de {total}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{active?.title}</h2>
          {active?.description !== undefined ? (
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{active.description}</p>
          ) : null}
        </div>
        {headerRight !== undefined ? <div className="shrink-0 pt-1">{headerRight}</div> : null}
      </div>
      <div className="mt-6 pb-2">
        <div className="relative h-14">
          <div
            className="absolute top-4 h-1.5 overflow-hidden rounded-full bg-muted"
            style={{ left: `${edgeOffsetPct}%`, right: `${edgeOffsetPct}%` }}
          >
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <ol className="absolute inset-x-0 top-0 flex items-start justify-between" aria-label="Progresso">
            {steps.map((step, index) => (
              <StepCircle
                key={`${step.title}-${index}`}
                index={index}
                step={step}
                isDone={index < clamped}
                isActive={index === clamped}
              />
            ))}
          </ol>
        </div>
      </div>
    </header>
  );
}
