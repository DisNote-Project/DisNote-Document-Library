import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { isJsonValue, createDocument, paragraph, text, validateDocument } from '../../src/core/index.js';
test('accepts plain JSON from other realms while rejecting class and special objects', () => {
  assert.equal(isJsonValue(runInNewContext('({ nested: { value: 3 }, list: [true, null] })')), true);
  for (const expression of ['new Date()', 'new Map()', 'new Set()', 'new (class Example { value = 3 })()', 'Object.create({ value: 3 })']) {
    assert.equal(isJsonValue(runInNewContext(expression)), false, expression);
  }
  const document = createDocument({ blocks: [paragraph([text('hello')])] });
  const foreign = runInNewContext(`JSON.parse(${JSON.stringify(JSON.stringify(document))})`);
  assert.equal(validateDocument(foreign).ok, true);
});
