import type { IPty } from 'node-pty';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalPtySession } from './local-pty';

const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());

vi.mock('@main/lib/logger', () => ({
  log: {
    error: mockLogError,
    warn: mockLogWarn,
    info: vi.fn(),
  },
}));

function makeProc() {
  const proc = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
  };
  return proc;
}

describe('LocalPtySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contains onData handler errors inside the PTY callback', () => {
    const proc = makeProc();
    const session = new LocalPtySession('session-1', proc as unknown as IPty);

    session.onData(() => {
      throw new Error('classifier failed');
    });

    const callback = proc.onData.mock.calls[0][0] as (data: string) => void;

    expect(() => callback('chunk')).not.toThrow();
    expect(mockLogError).toHaveBeenCalledWith(
      'LocalPtySession:onData handler failed',
      expect.objectContaining({
        id: 'session-1',
        error: 'classifier failed',
      })
    );
  });

  it('contains onExit handler errors inside the PTY callback', () => {
    const proc = makeProc();
    const session = new LocalPtySession('session-1', proc as unknown as IPty);

    session.onExit(() => {
      throw new Error('exit listener failed');
    });

    const callback = proc.onExit.mock.calls[0][0] as (info: { exitCode: number }) => void;

    expect(() => callback({ exitCode: 1 })).not.toThrow();
    expect(mockLogError).toHaveBeenCalledWith(
      'LocalPtySession:onExit handler failed',
      expect.objectContaining({
        id: 'session-1',
        error: 'exit listener failed',
      })
    );
  });

  it('logs write and kill failures without throwing', () => {
    const proc = makeProc();
    proc.write.mockImplementation(() => {
      throw new Error('write failed');
    });
    proc.kill.mockImplementation(() => {
      throw new Error('kill failed');
    });
    const session = new LocalPtySession('session-1', proc as unknown as IPty);

    expect(() => session.write('input')).not.toThrow();
    expect(() => session.kill()).not.toThrow();

    expect(mockLogWarn).toHaveBeenCalledWith(
      'LocalPtySession:write failed',
      expect.objectContaining({ id: 'session-1', error: 'write failed' })
    );
    expect(mockLogWarn).toHaveBeenCalledWith(
      'LocalPtySession:kill failed',
      expect.objectContaining({ id: 'session-1', error: 'kill failed' })
    );
  });
});
