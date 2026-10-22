import { describe, it, expect } from 'vitest';
import { isWalkable } from '../playerMovement';

describe('isWalkable', () => {
  const defaultRects = [
    { x1: 0, y1: 0, x2: 10, y2: 10 },
    { x1: 20, y1: 20, x2: 30, y2: 30 }
  ];

  it('returns true when coordinates are inside a single rectangle', () => {
    expect(isWalkable(5, 5, defaultRects)).toBe(true);
  });

  it('returns false when coordinates are outside all rectangles', () => {
    expect(isWalkable(15, 15, defaultRects)).toBe(false);
  });

  it('returns true when coordinates match the boundary of a rectangle', () => {
    // Top-left
    expect(isWalkable(0, 0, defaultRects)).toBe(true);
    // Bottom-right
    expect(isWalkable(10, 10, defaultRects)).toBe(true);
    // Edge
    expect(isWalkable(5, 10, defaultRects)).toBe(true);
  });

  it('returns true if the coordinate is in any of multiple rectangles', () => {
    // Inside the second rectangle
    expect(isWalkable(25, 25, defaultRects)).toBe(true);
  });

  it('returns false if the walkableRects array is empty', () => {
    expect(isWalkable(5, 5, [])).toBe(false);
  });
});
