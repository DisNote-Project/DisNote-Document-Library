import { canonicalJson, type JsonValue } from "../../core/index.js";
import { sha256Hex } from "../../core/serialization/sha256.js";
import { validateCell, validateFilter } from "../evaluate.js";
import type { DatabaseSnapshot, DatabaseRecord } from "../model.js";
import { AUTOMATION_ERRORS as E, AUTOMATION_LIMITS as L, type DatabaseAutomationRule, type DatabaseAutomationState, type OwnedAutomationRule } from "./model.js";
export const automationVersion = (rule: DatabaseAutomationRule) => sha256Hex(canonicalJson(rule as unknown as JsonValue));
export const automationJobId = (database: string, rule: OwnedAutomationRule, record: string, event: string) => sha256Hex(JSON.stringify([database, rule.id, rule.version, record, event]));
export function validateAutomationRules(rules: DatabaseAutomationRule[], database: DatabaseSnapshot): void {
  if (!Array.isArray(rules) || rules.length > L.RULES) throw new Error(E.INVALID);
  if (JSON.stringify(rules).length > 1000000) throw new Error(E.INVALID);
  const ids = new Set<string>(), properties = new Set(database.properties.map(property => property.id));
  for (const rule of rules) {
    if (!rule || typeof rule.id !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(rule.id) || ids.has(rule.id) || typeof rule.name !== "string" || !rule.name.trim() || rule.name.length > 200 || typeof rule.enabled !== "boolean" || !rule.trigger || !Array.isArray(rule.actions) || !rule.actions.length || rule.actions.length > L.ACTIONS) throw new Error(E.INVALID);
    ids.add(rule.id);
    const trigger = rule.trigger;
    if (!["created", "updated", "propertyChanged", "schedule"].includes(trigger.kind)) throw new Error(E.INVALID);
    if (trigger.kind === "propertyChanged" && !properties.has(trigger.propertyId)) throw new Error(E.INVALID);
    if (trigger.kind === "schedule" && (typeof trigger.startAt !== "string" || !Number.isFinite(Date.parse(trigger.startAt)) || (trigger.intervalMinutes !== undefined && (!Number.isInteger(trigger.intervalMinutes) || trigger.intervalMinutes < L.MIN_INTERVAL_MINUTES || trigger.intervalMinutes > 525600)))) throw new Error(E.INVALID);
    if (rule.condition) validateFilter(rule.condition, properties);
    for (const action of rule.actions) {
      if (!action || !["patch", "createRecord", "webhook"].includes(action.kind)) throw new Error(E.INVALID);
      if (action.kind === "webhook") {
        if (typeof action.targetId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(action.targetId) || !Array.isArray(action.propertyIds) || action.propertyIds.length > 200 || action.propertyIds.some(id => !properties.has(id)) || new Set(action.propertyIds).size !== action.propertyIds.length) throw new Error(E.INVALID);
      } else {
        if (!action.values || typeof action.values !== "object" || Array.isArray(action.values) || !Object.keys(action.values).length) throw new Error(E.INVALID);
        for (const [id, value] of Object.entries(action.values)) { const property = database.properties.find(item => item.id === id); if (!property || !validateCell(property, value)) throw new Error(E.INVALID); }
      }
    }
  }
}
export function trimAutomationHistory(state: DatabaseAutomationState): void {
  const terminal = state.jobs.filter(job => ["succeeded", "failed", "cancelled"].includes(job.status));
  const keep = new Set(terminal.slice(-L.HISTORY).map(job => job.id));
  state.jobs = state.jobs.filter(job => !["succeeded", "failed", "cancelled"].includes(job.status) || keep.has(job.id));
}
export function enqueueAutomation(state: DatabaseAutomationState, databaseId: string, rule: OwnedAutomationRule, recordId: string, event: string, now: string): void {
  const id = automationJobId(databaseId, rule, recordId, event);
  if (state.jobs.some(job => job.id === id)) return;
  trimAutomationHistory(state);
  if (state.jobs.length >= L.JOBS) throw new Error(E.INVALID);
  state.jobs.push({ id, ruleId: rule.id, ruleVersion: rule.version, actor: rule.actor, recordId, status: "queued", step: 0, attempts: 0, createdAt: now, nextAt: now });
}
/** Called inside the source record CAS. Payload data is read/authorized when executed. */
export function captureDatabaseAutomations(before: DatabaseSnapshot, after: DatabaseSnapshot, now: string): void {
  if (!before.automation) { delete after.automation; return; }
  after.automation = structuredClone(before.automation);
  const previous = new Map(before.records.map(record => [record.id, record]));
  for (const record of after.records) {
    const old = previous.get(record.id);
    if (old && JSON.stringify(old) === JSON.stringify(record)) continue;
    for (const rule of after.automation.rules) if (rule.enabled && matchesTrigger(rule, old, record)) enqueueAutomation(after.automation, after.id, rule, record.id, String(after.revision), now);
  }
}
function matchesTrigger(rule: DatabaseAutomationRule, before: DatabaseRecord | undefined, after: DatabaseRecord): boolean {
  const trigger = rule.trigger;
  return trigger.kind === "created" ? !before : trigger.kind === "updated" ? !!before : trigger.kind === "propertyChanged" ? !!before && JSON.stringify(before.values[trigger.propertyId] ?? null) !== JSON.stringify(after.values[trigger.propertyId] ?? null) : false;
}
