import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRoomCode } from './utils.js';

describe('generateRoomCode', () => {
  test('should return a string of length 6', () => {
    const code = generateRoomCode();
    assert.strictEqual(typeof code, 'string');
    assert.strictEqual(code.length, 6);
  });

  test('should only contain valid characters', () => {
    const validChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const code = generateRoomCode();
    for (const char of code) {
      assert.ok(validChars.includes(char), `Character '${char}' is not in valid characters list`);
    }
  });

  test('should generate different codes on successive calls (randomness)', () => {
    // Generate 100 codes and ensure they are all unique.
    // While there's a tiny probability of collision, 6 chars from a 31-char set
    // (31^6 = 887,503,681 possibilities) makes collision in 100 tries virtually impossible.
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    assert.strictEqual(codes.size, 100);
  });
});
