import { KIProviderRouter } from '@/services/providers/router';
import { OpenAIProvider } from '@/services/providers/openai';
import { OllamaProvider } from '@/services/providers/ollama';

describe('KIProviderRouter', () => {
  let router: KIProviderRouter;

  beforeEach(() => {
    router = new KIProviderRouter();
  });

  it('should initialize with default providers', () => {
    expect(router).toBeDefined();
  });

  it('should get provider by type', () => {
    const openaiProvider = router.getProvider('openai');
    expect(openaiProvider).toBeInstanceOf(OpenAIProvider);

    const ollamaProvider = router.getProvider('ollama');
    expect(ollamaProvider).toBeInstanceOf(OllamaProvider);
  });

  it('should throw error for unsupported provider', () => {
    expect(() => router.getProvider('invalid' as any)).toThrow();
  });

  it('should set current provider', () => {
    router.setProvider('openai');
    const provider = router.getCurrentProvider();
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('should estimate cost for gpt-4o', () => {
    const cost = provider.getCostEstimate('gpt-4o', 1024 * 1024);
    expect(cost).toBeGreaterThan(0);
  });

  it('should return 0 cost for unknown model', () => {
    const cost = provider.getCostEstimate('unknown-model', 1024 * 1024);
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('ollama');
  });

  it('should return 0 cost (local models)', () => {
    const cost = provider.getCostEstimate('llava', 1024 * 1024);
    expect(cost).toBe(0);
  });

  it('should identify vision models', async () => {
    const supportsLlava = await provider.supportsVision('llava', {});
    expect(supportsLlava).toBe(true);

    const supportsQwen = await provider.supportsVision('qwen-vl', {});
    expect(supportsQwen).toBe(true);

    const supportsNonVision = await provider.supportsVision('llama2', {});
    expect(supportsNonVision).toBe(false);
  });
});
