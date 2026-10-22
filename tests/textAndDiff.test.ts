import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsSanitizing, removeEmDashes } from '../src/textSanitizer';
import { computeSimpleDiff } from '../src/diffUtil';
import { buildPromptInstructions, isTransientError, parseSections } from '../server/editEngine';
import { DEFAULT_CONFIG } from '../src/types';

test('em dashes and their stand-ins become plain hyphens', () => {
  assert.equal(removeEmDashes('wait\u2014what'), 'wait - what');
  assert.equal(removeEmDashes('ranges 1\u20135'), 'ranges 1 - 5');
  assert.equal(removeEmDashes('so -- yes'), 'so - yes');
  assert.equal(removeEmDashes('"\u2014Hello"'), '"- Hello"');
  assert.equal(removeEmDashes('Stop\u2014.'), 'Stop.');
  assert.equal(removeEmDashes('a &mdash; b'), 'a - b');
  assert.equal(removeEmDashes('two  spaces\n\nkept newlines'), 'two spaces\n\nkept newlines');
});

test('clean text is returned untouched and flagged as clean', () => {
  const clean = 'Nothing to change here - single hyphens are fine.\nNew line.';
  assert.equal(needsSanitizing(clean), false);
  assert.equal(removeEmDashes(clean), clean);
});

const rebuild = (tokens: ReturnType<typeof computeSimpleDiff>, side: 'original' | 'revised') =>
  tokens
    .filter((t) => t.type !== (side === 'original' ? 'added' : 'removed'))
    .map((t) => t.value)
    .join('');

test('diff marks only the words that actually changed', () => {
  const tokens = computeSimpleDiff('The heat was rising fast.', 'The heat was climbing fast.');
  assert.deepEqual(
    tokens.filter((t) => t.type !== 'unchanged').map((t) => [t.type, t.value]),
    [
      ['removed', 'rising'],
      ['added', 'climbing'],
    ]
  );
});

test('diff output always rebuilds both texts exactly (spacing included)', () => {
  const a = 'One  two\nthree four five six seven';
  const b = 'One two three\nFOUR five seven eight';
  const tokens = computeSimpleDiff(a, b);
  assert.equal(rebuild(tokens, 'original'), a);
  assert.equal(rebuild(tokens, 'revised'), b);
});

test('diff handles empty sides', () => {
  assert.deepEqual(computeSimpleDiff('', 'new text'), [{ type: 'added', value: 'new text' }]);
  assert.deepEqual(computeSimpleDiff('old text', ''), [{ type: 'removed', value: 'old text' }]);
  assert.deepEqual(computeSimpleDiff('same', 'same'), [{ type: 'unchanged', value: 'same' }]);
});

test('section headers are parsed even when the model is sloppy about spacing or case', () => {
  const out = parseSections(
    'Intro\n=== SECTION 1 ===\nFirst part.\n====  section 2 ====\nSecond part.\n=== FULL UNSPLIT COPY ===\nFirst part. Second part.'
  );
  assert.deepEqual(
    out.sections.map((s) => [s.title, s.content]),
    [
      ['SECTION 1', 'First part.'],
      ['SECTION 2', 'Second part.'],
    ]
  );
  assert.equal(out.fullUnsplitCopy, 'First part. Second part.');
});

test('a rule group with every sub-option off adds nothing to the prompt', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  config.loreRules = { enabled: true, baselinerGenderless: false, baselinerBodyLanguage: false, protagonistCapitalized: false, preserveCreativeLore: false };
  const { instructions, ruleNames } = buildPromptInstructions(config);
  assert.ok(!ruleNames.includes('Lore & Character Rules'));
  assert.ok(instructions.every((i) => i.trim().length > 0));
});

test('rate limits and overloads are retried; other errors are not', () => {
  assert.equal(isTransientError({ status: 429 }), true);
  assert.equal(isTransientError(new Error('RESOURCE_EXHAUSTED: quota')), true);
  assert.equal(isTransientError({ status: 400, message: 'API key not valid' }), false);
});
