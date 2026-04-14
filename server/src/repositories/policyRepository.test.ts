import test from 'node:test';
import assert from 'node:assert/strict';
import { PolicyRepository } from './policyRepository.js';

test('PolicyRepository derives strict preset from lock flag', () => {
    const repo = new PolicyRepository();
    const preset = repo.derivePresetFromFlags(true, false);
    assert.equal(preset, 'strict');
});

test('PolicyRepository derives controlled preset from waiting room', () => {
    const repo = new PolicyRepository();
    const preset = repo.derivePresetFromFlags(false, true);
    assert.equal(preset, 'controlled');
});

test('PolicyRepository derives open preset for unlocked no waiting room', () => {
    const repo = new PolicyRepository();
    const preset = repo.derivePresetFromFlags(false, false);
    assert.equal(preset, 'open');
});
