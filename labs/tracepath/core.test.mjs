import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSpans, exclusiveTime, analyzeTrace, demoTrace } from './core.mjs';

test('overlapping children are subtracted once from exclusive time', () => {
  const spans = [
    { id:'p', parentId:null, start:0, duration:100 },
    { id:'a', parentId:'p', start:10, duration:50 },
    { id:'b', parentId:'p', start:40, duration:40 }
  ];
  assert.equal(exclusiveTime(spans,'p'),30);
});

test('missing parent is reported', () => {
  const issues = validateSpans([{ id:'a', parentId:'missing', start:0, duration:2 }]);
  assert.equal(issues[0].type,'missing-parent');
});

test('child outside parent boundary is reported', () => {
  const issues = validateSpans([
    { id:'p', parentId:null, start:10, duration:20 },
    { id:'c', parentId:'p', start:5, duration:10 }
  ]);
  assert.ok(issues.some(issue => issue.type === 'parent-boundary'));
});

test('demo analysis finds the root as largest exclusive contributor', () => {
  const result = analyzeTrace(demoTrace(false));
  assert.equal(result.bottleneck.id,'root');
  assert.equal(result.wallTime,420);
});

test('cycle is detected without infinite traversal', () => {
  const issues = validateSpans([
    { id:'a', parentId:'b', start:0, duration:10 },
    { id:'b', parentId:'a', start:0, duration:10 }
  ]);
  assert.ok(issues.some(issue => issue.type === 'cycle'));
});
