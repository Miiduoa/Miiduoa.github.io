import test from 'node:test';
import assert from 'node:assert/strict';
import { stableBucket, evaluateFlag, demoFlag } from './core.mjs';

test('bucket is stable for the same subject and salt', () => {
  assert.equal(stableBucket('u-123','flag-a'),stableBucket('u-123','flag-a'));
});

test('first matching targeting rule wins before rollout', () => {
  const result = evaluateFlag(demoFlag({rollout:0}),{userId:'u1',role:'staff',country:'TW',plan:'free'});
  assert.equal(result.value,true);
  assert.equal(result.ruleId,'staff-on');
});

test('kill switch overrides targeting rules', () => {
  const result = evaluateFlag(demoFlag({killSwitch:true,rollout:100}),{userId:'u1',role:'staff',country:'TW',plan:'pro'});
  assert.equal(result.value,false);
  assert.equal(result.reason,'kill-switch');
});

test('100 percent rollout enables ordinary subject', () => {
  const result = evaluateFlag(demoFlag({rollout:100}),{userId:'u2',role:'student',country:'TW',plan:'free'});
  assert.equal(result.value,true);
  assert.equal(result.reason,'rollout');
});

test('invalid rollout fails closed', () => {
  const result = evaluateFlag(demoFlag({rollout:120}),{userId:'u2'});
  assert.equal(result.value,false);
  assert.equal(result.reason,'invalid-config');
});
