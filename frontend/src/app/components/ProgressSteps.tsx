"use client";

interface Step {
  key: string;
  label: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
}

const DEFAULT_ATI_STEPS: Step[] = [
  { key: "reception", label: "Reception" },
  { key: "instruction", label: "Instruction" },
  { key: "validation", label: "Validation" },
  { key: "decision", label: "Decision" },
];

export function ProgressSteps({
  steps = DEFAULT_ATI_STEPS,
  currentStep,
  completedSteps = [],
}: ProgressStepsProps) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.key) || i < currentIdx;
        const isCurrent = step.key === currentStep;
        const isPending = !isCompleted && !isCurrent;

        const dotColor = isCompleted
          ? "#059669"
          : isCurrent
            ? "#3b82f6"
            : "var(--border-color, #d1d5db)";

        const lineColor = isCompleted ? "#059669" : "var(--border-color, #d1d5db)";

        return (
          <div
            key={step.key}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}
          >
            {/* Connector line */}
            {i > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "50%",
                  width: "100%",
                  height: "2px",
                  background: lineColor,
                  zIndex: 0,
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: dotColor,
                border: isCurrent ? "3px solid #93c5fd" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                color: "#fff",
                fontWeight: 700,
                zIndex: 1,
                position: "relative",
              }}
            >
              {isCompleted ? "\u2713" : i + 1}
            </div>

            {/* Label */}
            <span
              style={{
                marginTop: "0.35rem",
                fontSize: "0.7rem",
                fontWeight: isCurrent ? 700 : 500,
                color: isPending
                  ? "var(--text-secondary, #9ca3af)"
                  : "var(--text-primary, #1f2937)",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_ATI_STEPS };
