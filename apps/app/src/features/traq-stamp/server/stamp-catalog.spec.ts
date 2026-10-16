vi.mock('~/utils/logger', () => ({ default: () => ({ warn: vi.fn() }) }));

describe('traQ stamp catalog', () => {
  const request = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubEnv('TRAQ_ENABLED', 'true');
    vi.stubEnv('TRAQ_STAMPS_ENABLED', 'true');
    vi.stubEnv('TRAQ_ISSUER_HOST', 'https://q.example.com');
    vi.stubGlobal('fetch', request);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not fetch when stamp integration is disabled independently of authentication', async () => {
    vi.stubEnv('TRAQ_STAMPS_ENABLED', 'false');
    const { getTraqStampConfig } = await import('./stamp-catalog');
    expect(await getTraqStampConfig()).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it('shares a validated catalog between concurrent requests and refreshes after five minutes', async () => {
    request.mockResolvedValueOnce(
      Response.json({ all: ['smile', 'blob', 'smile', 'bad name', '<img>'] }),
    );
    const { getTraqStampConfig } = await import('./stamp-catalog');
    const configs = await Promise.all([
      getTraqStampConfig(),
      getTraqStampConfig(),
    ]);
    expect(configs).toEqual(
      Array(2).fill({
        origin: 'https://q.example.com',
        names: ['smile', 'blob'],
      }),
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      'https://q.example.com/api/1.0/public/emoji.json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    vi.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(await getTraqStampConfig()).toEqual(configs[0]);
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValueOnce(Response.json({ all: ['new_stamp'] }));
    vi.advanceTimersByTime(1);
    expect((await getTraqStampConfig())?.names).toEqual(['new_stamp']);
  });

  it('retains the last good catalog on an invalid refresh and waits before retrying', async () => {
    request.mockResolvedValueOnce(Response.json({ all: ['smile'] }));
    const { getTraqStampConfig } = await import('./stamp-catalog');
    const initial = await getTraqStampConfig();
    vi.advanceTimersByTime(5 * 60 * 1000);
    request.mockResolvedValueOnce(Response.json({ all: [null] }));
    expect(await getTraqStampConfig()).toEqual(initial);
    expect(await getTraqStampConfig()).toEqual(initial);
    expect(request).toHaveBeenCalledTimes(2);
    request.mockResolvedValueOnce(Response.json({ all: ['updated'] }));
    vi.advanceTimersByTime(60 * 1000);
    expect((await getTraqStampConfig())?.names).toEqual(['updated']);
  });

  it('falls back to literal normal stamps after initial failure and can recover', async () => {
    request.mockRejectedValueOnce(new Error('Network unavailable'));
    const { getTraqStampConfig } = await import('./stamp-catalog');
    expect(await getTraqStampConfig()).toEqual({
      origin: 'https://q.example.com',
      names: [],
    });
    expect(await getTraqStampConfig()).toEqual({
      origin: 'https://q.example.com',
      names: [],
    });
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValueOnce(Response.json({ all: ['smile'] }));
    vi.advanceTimersByTime(60 * 1000);
    expect((await getTraqStampConfig())?.names).toEqual(['smile']);
  });

  it('does not share names across different traQ origins', async () => {
    request.mockResolvedValueOnce(Response.json({ all: ['first'] }));
    const { getTraqStampConfig } = await import('./stamp-catalog');
    await getTraqStampConfig();
    vi.stubEnv('TRAQ_ISSUER_HOST', 'https://other.example.com');
    request.mockResolvedValueOnce(Response.json({ all: ['second'] }));
    expect(await getTraqStampConfig()).toEqual({
      origin: 'https://other.example.com',
      names: ['second'],
    });
  });
});
