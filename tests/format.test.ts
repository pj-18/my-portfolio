import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayUrl, formatDay, jsonForScript, truncate } from '../src/lib/format.ts';

test('truncate leaves short text alone and tidies whitespace', () => {
  assert.equal(truncate('  A short\n line.  ', 80), 'A short line.');
});

test('truncate prefers to stop at the end of a sentence', () => {
  const text = 'The first sentence is here. The second sentence runs on for quite a while longer than that.';
  assert.equal(truncate(text, 40), 'The first sentence is here.');
});

test('truncate keeps a closing quote with its sentence', () => {
  const text = 'He said “this is the end.” And then it carried on for a good deal longer than expected.';
  assert.equal(truncate(text, 40), 'He said “this is the end.”');
});

test('truncate otherwise cuts at a word boundary and adds an ellipsis', () => {
  const text = 'One long sentence without any full stop that simply keeps going and going and going';
  const result = truncate(text, 30);
  assert.equal(result, 'One long sentence without any…');
  assert.ok(result.length <= 31);
});

test('truncate never splits an emoji', () => {
  const result = truncate('👨‍👩‍👧‍👦'.repeat(40), 10);
  assert.equal(result, '👨‍👩‍👧‍👦'.repeat(10) + '…');
});

test('formatDay treats the value as a calendar day', () => {
  assert.equal(formatDay('2026-11-08', 'en-GB'), '8 Nov 2026');
  assert.equal(formatDay('not a date', 'en-GB'), 'not a date');
});

test('displayUrl drops the scheme, www and trailing slash', () => {
  assert.equal(displayUrl('https://www.linkedin.com/in/someone/'), 'linkedin.com/in/someone');
  assert.equal(displayUrl('https://github.com/someone'), 'github.com/someone');
});

test('jsonForScript cannot close the script element it is embedded in', () => {
  assert.ok(!jsonForScript({ note: '</script><script>alert(1)</script>' }).includes('</script>'));
});
