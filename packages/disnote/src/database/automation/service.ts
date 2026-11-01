import { sha256Hex } from "../../core/serialization/sha256.js";
import { matchesFilter } from "../evaluate.js";
import { DATABASE_ERRORS, type DatabaseRepository, type DatabaseSnapshot } from "../model.js";
import { AUTOMATION_ERRORS as E, AUTOMATION_LIMITS as L, type AutomationDependencies, type DatabaseAutomationRule, type DatabaseAutomationJob, type DatabaseAutomationSummary } from "./model.js";
import { automationVersion, enqueueAutomation, trimAutomationHistory, validateAutomationRules } from "./rules.js";
const terminal = (job: DatabaseAutomationJob) => ["succeeded", "failed", "cancelled"].includes(job.status);
const denied = (error: unknown) => [E.DENIED, DATABASE_ERRORS.DENIED, DATABASE_ERRORS.MISSING].some(code => (error as Error)?.message === code);
/** Durable leases and per-step checkpoints. DB effects and checkpoints use one CAS. */
export class DatabaseAutomationService {
  private readonly now: () => number;
  private readonly nonce: () => string;
  constructor(private readonly repository: DatabaseRepository, private readonly dependencies: AutomationDependencies) {
    this.now = dependencies.now ?? Date.now; this.nonce = dependencies.nonce ?? (() => crypto.randomUUID());
  }
  async read(actor: string, id: string): Promise<DatabaseAutomationSummary> {
    await this.dependencies.assert(actor, id, "manage");
    const database = await this.load(id), state = database.automation ?? { rules: [], jobs: [] }, domain = await this.dependencies.domain(actor, this.repository);
    const jobs: DatabaseAutomationSummary["jobs"] = [];
    for (const job of [...state.jobs].reverse()) {
      if (job.actor !== actor) continue;
      try { await domain.record(actor, id, job.recordId); } catch (error) { if (denied(error)) continue; throw error; }
      const { actor: _actor, lease: _lease, ruleVersion: _version, ...publicJob } = job; jobs.push(publicJob);
    }
    return { revision: database.revision, rules: state.rules.filter(rule => rule.actor === actor).map(rule => this.publicRule(rule)), jobs };
  }
  async configure(actor: string, id: string, rules: DatabaseAutomationRule[], revision: number) {
    await this.dependencies.assert(actor, id, "manage");
    const current = await this.load(id); this.revision(current, revision);
    if (!Array.isArray(rules)) throw new Error(E.INVALID);
    const sanitized = rules.map(rule => this.publicRule(rule)); validateAutomationRules(sanitized, current);
    const next = structuredClone(current), old = current.automation?.rules ?? [];
    const otherRules = old.filter(rule => rule.actor !== actor);
    if (otherRules.length + sanitized.length > L.RULES || sanitized.some(rule => otherRules.some(other => other.id === rule.id))) throw new Error(E.INVALID);
    next.automation = { jobs: current.automation?.jobs ?? [], rules: [...otherRules, ...sanitized.map(rule => {
      const version = automationVersion(rule), previous = old.find(item => item.id === rule.id && item.version === version);
      return previous ?? { ...rule, actor, version, ...(rule.trigger.kind === "schedule" ? { nextAt: new Date(rule.trigger.startAt).toISOString() } : {}) };
    })] };
    await this.write(next, current.revision); return { id, revision: next.revision };
  }
  async retry(actor: string, id: string, jobId: string, revision: number) {
    await this.dependencies.assert(actor, id, "manage");
    const current = await this.load(id); this.revision(current, revision);
    const job = current.automation?.jobs.find(item => item.id === jobId);
    if (!job || job.status !== "failed") throw new Error(E.INVALID);
    if (job.actor !== actor) throw new Error(E.DENIED);
    await (await this.dependencies.domain(actor, this.repository)).record(actor, id, job.recordId);
    job.status = "queued"; job.attempts = 0; job.nextAt = this.iso(); delete job.error; delete job.lease;
    await this.write(current, revision); return { id, revision: current.revision };
  }
  /** Host-only worker entry. Never expose an untrusted actor override over HTTP. */
  async tick(id: string, maximumJobs = 5): Promise<void> {
    if (!Number.isInteger(maximumJobs) || maximumJobs < 1 || maximumJobs > 50) throw new Error(E.INVALID);
    await this.schedule(id);
    for (let at = 0; at < maximumJobs; at++) { const claim = await this.claim(id); if (!claim) return; await this.execute(id, claim.id, claim.token); }
  }
  private publicRule(rule: DatabaseAutomationRule): DatabaseAutomationRule {
    if (!rule || typeof rule !== "object") throw new Error(E.INVALID);
    return structuredClone({ id: rule.id, name: rule.name, enabled: rule.enabled, trigger: rule.trigger, ...(rule.condition ? { condition: rule.condition } : {}), actions: rule.actions });
  }
  private async schedule(id: string) {
    const current = await this.load(id), state = current.automation;
    if (!state) return;
    trimAutomationHistory(state);
    let changed = false;
    for (const rule of state.rules) {
      if (!rule.enabled || rule.trigger.kind !== "schedule" || !rule.nextAt || Date.parse(rule.nextAt) > this.now()) continue;
      try { await this.dependencies.assert(rule.actor, id, "manage"); } catch (error) { if (denied(error)) { rule.nextAt = new Date(this.now() + 60000).toISOString(); changed = true; continue; } throw error; }
      rule.pendingRun ??= { at: rule.nextAt, recordIds: current.records.map(record => record.id), offset: 0 };
      const run = rule.pendingRun, available = Math.max(0, L.JOBS - state.jobs.length), end = Math.min(run.recordIds.length, run.offset + Math.min(100, available));
      for (; run.offset < end; run.offset++) enqueueAutomation(state, id, rule, run.recordIds[run.offset]!, `schedule:${run.at}`, this.iso());
      changed = true;
      if (run.offset >= run.recordIds.length) {
        delete rule.pendingRun;
        if (rule.trigger.intervalMinutes) { const interval = rule.trigger.intervalMinutes * 60000, start = Date.parse(rule.trigger.startAt); rule.nextAt = new Date(start + (Math.floor((this.now() - start) / interval) + 1) * interval).toISOString(); }
        else delete rule.nextAt;
      }
    }
    if (changed) await this.write(current, current.revision);
  }
  private async claim(id: string) {
    const current = await this.load(id), now = this.now();
    const job = current.automation?.jobs.find(item => !terminal(item) && (item.status === "running" ? !item.lease || Date.parse(item.lease.until) <= now : Date.parse(item.nextAt) <= now));
    if (!job) return null;
    const token = this.nonce(); job.status = "running"; job.lease = { token, until: new Date(now + L.LEASE_MS).toISOString() }; job.attempts++;
    await this.write(current, current.revision); return { id: job.id, token };
  }
  private async execute(id: string, jobId: string, token: string) {
    try {
      for (let step = 0; step < L.ACTIONS; step++) {
        const current = await this.load(id), job = this.owned(current, jobId, token), rule = current.automation!.rules.find(item => item.id === job.ruleId);
        if (!rule?.enabled || rule.version !== job.ruleVersion) { await this.finish(current, job, "cancelled"); return; }
        await this.dependencies.assert(job.actor, id, "manage");
        const domain = await this.dependencies.domain(job.actor, this.repository), row = await domain.record(job.actor, id, job.recordId, "write");
        if (!job.step && rule.condition && !matchesFilter(row.record.values, rule.condition)) { await this.finish(current, job, "cancelled"); return; }
        validateAutomationRules([this.publicRule(rule)], current);
        const action = rule.actions[job.step];
        if (!action) { await this.finish(current, job, "succeeded"); return; }
        if (action.kind === "webhook") {
          if (!this.dependencies.webhook) throw new Error(E.EFFECT);
          const key = `${job.id}:${job.step}`;
          await this.dependencies.webhook(action.targetId, { eventId: key, databaseId: id, recordId: job.recordId, values: Object.fromEntries(action.propertyIds.map(property => [property, row.record.values[property] ?? null])) }, key);
          const latest = await this.load(id), claimed = this.owned(latest, jobId, token);
          claimed.step++; delete claimed.error; claimed.lease!.until = new Date(this.now() + L.LEASE_MS).toISOString();
          if (claimed.step >= rule.actions.length) { claimed.status = "succeeded"; delete claimed.lease; } else claimed.attempts = 1;
          await this.write(latest, latest.revision); if (claimed.status === "succeeded") return;
        } else {
          // Domain writes a private draft; the outer commit includes its job checkpoint.
          let draft = structuredClone(current); delete draft.automation;
          const isolated: DatabaseRepository = { read: async requested => requested === id ? structuredClone(draft) : this.repository.read(requested), write: async (snapshot, revision) => { if (snapshot.id !== id || revision !== draft.revision) return false; draft = structuredClone(snapshot); return true; } };
          const executor = await this.dependencies.domain(job.actor, isolated);
          if (action.kind === "patch") await executor.mutate(job.actor, id, [{ kind: "patch", recordId: job.recordId, values: action.values }], current.revision);
          else {
            const recordId = `auto_${sha256Hex(`${job.id}:${job.step}`)}`;
            if (current.records.some(record => record.id === recordId)) throw new Error(E.INVALID);
            await executor.upsertRecord(job.actor, id, { id: recordId, values: action.values }, current.revision);
          }
          draft.automation = structuredClone(current.automation!); const completed = draft.automation.jobs.find(item => item.id === jobId)!;
          completed.step++; delete completed.error; completed.lease!.until = new Date(this.now() + L.LEASE_MS).toISOString();
          if (completed.step >= rule.actions.length) { completed.status = "succeeded"; delete completed.lease; } else completed.attempts = 1;
          await this.write(draft, current.revision); if (completed.status === "succeeded") return;
        }
      }
    } catch (error) {
      if ((error as Error).message === E.CONFLICT || (error as Error).message === DATABASE_ERRORS.CONFLICT) return;
      const current = await this.load(id); let job: DatabaseAutomationJob;
      try { job = this.owned(current, jobId, token); } catch { return; }
      const invalid = [E.INVALID, DATABASE_ERRORS.INVALID, DATABASE_ERRORS.CYCLE, DATABASE_ERRORS.LIMIT].some(code => (error as Error).message === code);
      job.error = denied(error) ? E.DENIED : invalid ? E.INVALID : E.EFFECT;
      job.status = denied(error) ? "cancelled" : invalid || job.attempts >= L.ATTEMPTS ? "failed" : "retry";
      job.nextAt = new Date(this.now() + Math.min(60000, 1000 * 2 ** (job.attempts - 1))).toISOString(); delete job.lease;
      await this.write(current, current.revision);
    }
  }
  private async finish(current: DatabaseSnapshot, job: DatabaseAutomationJob, status: "cancelled" | "succeeded") { job.status = status; delete job.lease; await this.write(current, current.revision); }
  private owned(database: DatabaseSnapshot, id: string, token: string) { const job = database.automation?.jobs.find(item => item.id === id); if (!job || job.status !== "running" || job.lease?.token !== token || Date.parse(job.lease.until) <= this.now()) throw new Error(E.CONFLICT); return job; }
  private iso() { return new Date(this.now()).toISOString(); }
  private revision(database: DatabaseSnapshot, expected: number) { if (!Number.isInteger(expected) || database.revision !== expected) throw new Error(E.CONFLICT); }
  private async load(id: string) { const current = await this.repository.read(id); if (!current) throw new Error(E.MISSING); return structuredClone(current); }
  private async write(database: DatabaseSnapshot, revision: number) { database.revision = revision + 1; if (!await this.repository.write(database, revision)) throw new Error(E.CONFLICT); }
}
