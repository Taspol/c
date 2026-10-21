type State = "todo" | "active" | "done";

export function Steps({ steps }: { steps: { label: string; state: State }[] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={s.label} className={`step ${s.state}`}>
          <span className="step-no">{s.state === "done" ? "✓" : i + 1}</span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}
