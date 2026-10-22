import { describe, it, expect, vi } from 'vitest';
import { sendMessage } from '../peer';

describe('sendMessage', () => {
  it('sends correctly serialized JSON with type and payload', () => {
    const conn = { send: vi.fn() };
    const type = 'test-type';
    const payload = { data: 'test-data' };

    sendMessage(conn, type, payload);

    expect(conn.send).toHaveBeenCalledTimes(1);
    expect(conn.send).toHaveBeenCalledWith(JSON.stringify({ type, payload }));
  });

  it('sends correctly serialized JSON with empty object payload when not provided', () => {
    const conn = { send: vi.fn() };
    const type = 'test-type-no-payload';

    sendMessage(conn, type);

    expect(conn.send).toHaveBeenCalledTimes(1);
    expect(conn.send).toHaveBeenCalledWith(JSON.stringify({ type, payload: {} }));
  });

  it('handles various payload types correctly', () => {
    const conn = { send: vi.fn() };
    const type = 'test-type-various';

    // Test with array
    let payload = [1, 2, 3];
    sendMessage(conn, type, payload);
    expect(conn.send).toHaveBeenLastCalledWith(JSON.stringify({ type, payload }));

    // Test with string
    payload = "string-payload";
    sendMessage(conn, type, payload);
    expect(conn.send).toHaveBeenLastCalledWith(JSON.stringify({ type, payload }));

    // Test with number
    payload = 42;
    sendMessage(conn, type, payload);
    expect(conn.send).toHaveBeenLastCalledWith(JSON.stringify({ type, payload }));

    // Test with null
    payload = null;
    sendMessage(conn, type, payload);
    expect(conn.send).toHaveBeenLastCalledWith(JSON.stringify({ type, payload }));
  });
});
