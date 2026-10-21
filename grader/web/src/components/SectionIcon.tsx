// Small line icons for the problem sections
const PATHS = {
  statement: "M4 2.5h6l3 3V14a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5ZM6 7.5h5M6 10h5M6 12.5h3",
  input: "M2 8h8M7 5l3 3-3 3M11 2.5h2.5v11H11",
  output: "M6 8h8M11 5l3 3-3 3M5 2.5H2.5v11H5",
  examples: "M5 4 1.5 8 5 12M11 4l3.5 4-3.5 4M9.5 3l-3 10",
};

export function SectionIcon({ name }: { name: keyof typeof PATHS }) {
  return (
    <span className="psec-icon" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[name]} />
      </svg>
    </span>
  );
}
