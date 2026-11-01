import { useEffect, useState } from "react";
import type { DatabaseChartQuery, DatabaseChartResult } from "../model.js";
import type { DatabaseViewProvider } from "./context.js";
import { useDatabaseMessages } from "./customization.js";
export function DatabaseChart({ databaseId, config, provider, locale, kind = "bar", revision }: { databaseId: string; config: DatabaseChartQuery; provider: DatabaseViewProvider; locale?: string; kind?: "bar" | "line" | "donut"; revision?: number }) {
  const [data, setData] = useState<DatabaseChartResult | null>(null), [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0), key = JSON.stringify(config), m = useDatabaseMessages(locale);
  useEffect(() => { let active = true; setData(null); setFailed(false); setOffset(0); if (provider.aggregate) void provider.aggregate(databaseId, JSON.parse(key)).then(result => { if (active) setData(result); }, () => { if (active) setFailed(true); }); return () => { active = false; }; }, [databaseId, provider, key, revision]);
  if (!provider.aggregate) return <p role="status">{m.unavailable}</p>;
  if (failed) return <p role="alert">{m.failed}</p>;
  if (!data) return <p role="status">{m.loading}</p>;
  const groups = data.groups.slice(offset, offset + 50), maximum = Math.max(1, ...groups.map(group => Math.abs(group.value))), minimum = Math.min(0, ...groups.map(group => group.value));
  const colors = ["var(--disnote-chart-1,#62aaa5)", "var(--disnote-chart-2,#6d9cc7)", "var(--disnote-chart-3,#bc94c9)", "var(--disnote-chart-4,#d4aa5d)", "var(--disnote-chart-5,#cf8890)"];
  const total = groups.reduce((sum, group) => sum + group.value / maximum, 0); let progress = 0;
  return <figure className="disnote-db__chart" aria-label={m.chart}>
    {kind === "bar" && groups.map((group, index) => <div className="disnote-db__bar-row" key={index}><span>{group.label || m.ungrouped}</span><div className="disnote-db__bar" style={{ width: `${Math.max(1, Math.abs(group.value) / maximum * 100)}%` }} /><output>{new Intl.NumberFormat(locale).format(group.value)}</output></div>)}
    {kind === "line" && <svg viewBox="0 0 440 230" role="img" aria-label={m.lineChart}><polyline fill="none" stroke={colors[0]} strokeWidth="3" points={groups.map((group, index) => `${groups.length < 2 ? 220 : 20 + index / (groups.length - 1) * 400},${210 - (group.value / maximum - minimum / maximum) / (1 - minimum / maximum || 1) * 190}`).join(" ")} />{groups.map((group, index) => <circle key={index} cx={groups.length < 2 ? 220 : 20 + index / (groups.length - 1) * 400} cy={210 - (group.value / maximum - minimum / maximum) / (1 - minimum / maximum || 1) * 190} r="4" fill={colors[0]}><title>{group.label}: {group.value}</title></circle>)}</svg>}
    {kind === "donut" && (groups.some(group => group.value < 0) ? <p role="status">{m.chartNonnegative}</p> : <svg viewBox="0 0 220 220" role="img" aria-label={m.donutChart}>{groups.map((group, index) => { const percent = total ? group.value / maximum / total * 100 : 0, from = progress; progress += percent; return <circle key={index} cx="110" cy="110" r="74" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth="30" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-from} transform="rotate(-90 110 110)"><title>{group.label}: {group.value}</title></circle>; })}</svg>)}
    {kind !== "bar" && <table><caption>{m.chartData}</caption><tbody>{groups.map((group, index) => <tr key={index}><th scope="row">{group.label || m.ungrouped}</th><td>{new Intl.NumberFormat(locale).format(group.value)}</td></tr>)}</tbody></table>}
    {data.groups.length > 50 && <nav aria-label={m.chart}><button type="button" disabled={offset === 0} onClick={() => setOffset(offset - 50)}>{m.previous}</button><span>{offset + 1}–{Math.min(offset + 50, data.groups.length)} / {data.groups.length}</span><button type="button" disabled={offset + 50 >= data.groups.length} onClick={() => setOffset(offset + 50)}>{m.next}</button></nav>}
    {!data.groups.length && <p>{m.empty}</p>}
  </figure>;
}
