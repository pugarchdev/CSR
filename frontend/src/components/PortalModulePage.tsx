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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{eyebrow}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 leading-normal">{description}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {actions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                  action.primary
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/10 hover:bg-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {metrics.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-glass">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{metric.label}</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{metric.value}</div>
            </div>
          ))}
        </section>
      )}

      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">Work Queue</h2>
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
