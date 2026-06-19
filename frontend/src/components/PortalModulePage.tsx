import Link from "next/link";

interface Metric {
  label: string;
  value: string;
}

interface Action {
  label: string;
  href: string;
  primary?: boolean;
}

interface PortalModulePageProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: Metric[];
  rows?: string[][];
  actions?: Action[];
}

export default function PortalModulePage({
  eyebrow,
  title,
  description,
  metrics = [],
  rows = [],
  actions = [],
}: PortalModulePageProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8 md:px-10">
      <section className="border border-gov-line bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="p-6 md:p-7">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-gov-saffron">{eyebrow}</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gov-navy md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gov-muted">{description}</p>
          {actions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`inline-flex min-h-10 items-center border px-4 py-2 text-sm font-bold ${
                    action.primary
                      ? "border-gov-blue bg-gov-blue text-white hover:bg-gov-navy"
                      : "border-gov-line bg-white text-gov-blue hover:bg-gov-mist"
                  }`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {metrics.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="border border-gov-line bg-white p-5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gov-muted">{metric.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-gov-ink">{metric.value}</div>
            </div>
          ))}
        </section>
      )}

      <section className="border border-gov-line bg-white shadow-sm">
        <div className="border-b border-gov-line px-5 py-4">
          <h2 className="text-base font-extrabold text-gov-navy">Work Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gov-line bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {(rows.length > 0 ? rows : [["No records", "Nothing pending in this queue", "System", "Clear"]]).map((row) => (
                <tr key={row.join("-")} className="bg-white">
                  <td className="px-5 py-4 font-bold text-gov-blue">{row[0]}</td>
                  <td className="px-5 py-4 font-semibold text-gov-ink">{row[1]}</td>
                  <td className="px-5 py-4 text-gov-muted">{row[2]}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                      {row[3]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
