export function PageHead({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
      {children && (
        <>
          <span className="spacer" />
          {children}
        </>
      )}
    </div>
  );
}
