import assert from "node:assert/strict";
import test from "node:test";

import { createWorkbook, InMemoryWorkbookStateRepository, RevisionWorkbookRepository, setCell } from "../src/index.js";

const NOW = "2026-11-15T00:00:00.000Z";

test("workbook repository provides optimistic CAS and idempotent retries", async () => {
  const states = new InMemoryWorkbookStateRepository();
  const repository = new RevisionWorkbookRepository(states);
  const source = createWorkbook({ id: "stored", title: "Stored", now: NOW });
  assert.equal((await repository.create(source)).ok, true);
  assert.deepEqual(await repository.create(source), { ok: false, reason: "already-exists" });
  const changed = setCell(source, source.activeSheetId, "A1", { value: 1 }, { now: NOW });
  const saved = await repository.save({ workbook: changed, expectedRevision: 1, idempotencyKey: "save-1" });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.workbook.revision, 2);
  const replay = await repository.save({ workbook: changed, expectedRevision: 1, idempotencyKey: "save-1" });
  assert.equal(replay.ok && replay.idempotent, true);
  assert.deepEqual(await repository.save({ workbook: changed, expectedRevision: 1, idempotencyKey: "save-2" }), { ok: false, reason: "revision-conflict", currentRevision: 2 });
  const loaded = await repository.get(source.id);
  assert.equal(loaded?.sheets[0]?.cells.A1?.value, 1);
  if (loaded) loaded.sheets[0]!.cells.A1 = { value: 999 };
  assert.equal((await repository.get(source.id))?.sheets[0]?.cells.A1?.value, 1);
});
