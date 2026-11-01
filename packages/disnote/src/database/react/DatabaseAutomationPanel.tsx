import type { DatabaseProperty } from "../model.js";
import { AUTOMATION_ERRORS } from "../automation/model.js";
import type { DatabaseViewProvider } from "./context.js";
import { useDatabaseAutomations } from "./useDatabaseAutomations.js";
import { AutomationRuleEditor } from "./AutomationRuleEditor.js";
import { useDatabaseMessages } from "./customization.js";
export function DatabaseAutomationPanel({ databaseId, provider, properties, locale, onChanged }: { databaseId: string; provider: DatabaseViewProvider & { automation: NonNullable<DatabaseViewProvider["automation"]> }; properties: DatabaseProperty[]; locale?: string; onChanged(): Promise<void> }) {
  const state = useDatabaseAutomations(databaseId, provider.automation, onChanged), m = useDatabaseMessages(locale), first = properties.find(property => property.type !== "formula" && property.type !== "rollup");
  return <section aria-label={m.automations}>
    {state.failed && <p role="alert">{m.conflict}<button type="button" disabled={state.busy} onClick={() => void state.reload()}>{m.reloadConfiguration}</button></p>}
    {!state.state && !state.failed && <p role="status">{m.loading}</p>}
    {state.state && <><form className="disnote-db__form" aria-label={m.automations} onSubmit={event => { event.preventDefault(); void state.save(); }}>
      {state.draft.map(rule => <div key={rule.id}><AutomationRuleEditor rule={rule} provider={provider} properties={properties} targets={state.state!.targets ?? []} locale={locale} onChange={next => state.setDraft(state.draft.map(item => item.id === rule.id ? next : item))} /><button type="button" onClick={() => state.setDraft(state.draft.filter(item => item.id !== rule.id))}>{m.remove}</button></div>)}
      <button type="button" disabled={!first || state.draft.length >= 50} onClick={() => state.setDraft([...state.draft, { id: crypto.randomUUID(), name: m.newAutomation, enabled: false, trigger: { kind: "created" }, actions: [{ kind: "patch", values: { [first!.id]: null } }] }])}>{m.newAutomation}</button>
      <button type="submit" disabled={state.busy}>{m.save}</button>
      {!state.state.targets?.length && <p>{m.noWebhookTargets}</p>}
    </form><div className="disnote-db__table-scroll"><table><caption>{m.automationHistory}</caption><thead><tr><th>{m.automationName}</th><th>{m.jobRecord}</th><th>{m.jobStatus}</th><th>{m.jobStep}</th><th>{m.jobAttempts}</th><th>{m.jobNext}</th><th>{m.action}</th></tr></thead><tbody>{state.state.jobs.map(job => <tr key={job.id}><td>{state.state!.rules.find(rule => rule.id === job.ruleId)?.name ?? job.ruleId}</td><td>{job.recordId}</td><td>{m[`status_${job.status}`]}{job.error && <p>{job.error === AUTOMATION_ERRORS.DENIED ? m.automationDenied : job.error === AUTOMATION_ERRORS.INVALID ? m.automationInvalid : m.automationEffectFailed}</p>}</td><td>{job.step}</td><td>{job.attempts}</td><td><time dateTime={job.nextAt}>{new Date(job.nextAt).toLocaleString(locale)}</time></td><td>{job.status === "failed" && <button type="button" disabled={state.busy} onClick={() => void state.retry(job.id)}>{m.retry}</button>}</td></tr>)}</tbody></table></div></>}
  </section>;
}
