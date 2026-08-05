import { describe, it, expect } from 'vitest';
import { isWalkable } from '../playerMovement.js';

describe('isWalkable', () => {
  const walkableRects = [
    { x1: 0, y1: 0, x2: 10, y2: 10 },
    { x1: 20, y1: 20, x2: 30, y2: 30 },
  ];

  it('should return false for an empty list of rectangles', () => {
    expect(isWalkable(5, 5, [])).toBe(false);
  });

  it('should return true for a point clearly inside a rectangle', () => {
    expect(isWalkable(5, 5, walkableRects)).toBe(true);
    expect(isWalkable(25, 25, walkableRects)).toBe(true);
  });

  it('should return true for a point on the top boundary', () => {
    expect(isWalkable(5, 0, walkableRects)).toBe(true);
  });

  it('should return true for a point on the bottom boundary', () => {
    expect(isWalkable(5, 10, walkableRects)).toBe(true);
  });

  it('should return true for a point on the left boundary', () => {
    expect(isWalkable(0, 5, walkableRects)).toBe(true);
  });

  it('should return true for a point on the right boundary', () => {
    expect(isWalkable(10, 5, walkableRects)).toBe(true);
  });

  it('should return true for a point on a corner', () => {
    expect(isWalkable(0, 0, walkableRects)).toBe(true);
    expect(isWalkable(10, 10, walkableRects)).toBe(true);
    expect(isWalkable(0, 10, walkableRects)).toBe(true);
    expect(isWalkable(10, 0, walkableRects)).toBe(true);
  });

  it('should return false for a point outside all rectangles', () => {
    expect(isWalkable(-1, 5, walkableRects)).toBe(false); // Left of first rect
    expect(isWalkable(11, 5, walkableRects)).toBe(false); // Right of first rect
    expect(isWalkable(5, -1, walkableRects)).toBe(false); // Above first rect
    expect(isWalkable(5, 11, walkableRects)).toBe(false); // Below first rect
    expect(isWalkable(15, 15, walkableRects)).toBe(false); // Between rects
    expect(isWalkable(31, 31, walkableRects)).toBe(false); // Outside second rect
  });

  it('should handle multiple overlapping rectangles correctly', () => {
    const overlappingRects = [
      { x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 5, y1: 5, x2: 15, y2: 15 },
    ];
    // In first rect only
    expect(isWalkable(2, 2, overlappingRects)).toBe(true);
    // In overlapping region
    expect(isWalkable(7, 7, overlappingRects)).toBe(true);
    // In second rect only
    expect(isWalkable(12, 12, overlappingRects)).toBe(true);
    // Outside both
    expect(isWalkable(16, 16, overlappingRects)).toBe(false);
  });

  it('should return true when a point is in at least one rectangle, even if there are many', () => {
    const manyRects = [
      { x1: 100, y1: 100, x2: 110, y2: 110 },
      { x1: 200, y1: 200, x2: 210, y2: 210 },
      { x1: 300, y1: 300, x2: 310, y2: 310 },
    ];
    expect(isWalkable(205, 205, manyRects)).toBe(true);
    expect(isWalkable(305, 305, manyRects)).toBe(true);
    expect(isWalkable(405, 405, manyRects)).toBe(false);
  });
});
