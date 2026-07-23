// @forge/ai-engine/prompt-cache
// In-memory prompt cache that caches rendered prompts by fingerprint.
// Reduces redundant LLM calls for identical prompt renderings.

export interface CacheEntry {
  readonly key: string;
  readonly value: string;
  readonly createdAt: string;
  readonly ttl: number; // ms
  readonly hits: number;
}

export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly oldestEntry: string | null;
  readonly newestEntry: string | null;
}

export interface PromptCacheConfig {
  readonly maxSize: number;
  readonly defaultTTL: number; // ms, 0 = infinite
}

export class PromptCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private config: PromptCacheConfig;

  constructor(config?: Partial<PromptCacheConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 1000,
      defaultTTL: config?.defaultTTL ?? 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Get a cached prompt by key.
   */
  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (entry.ttl > 0) {
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        this.misses++;
        return undefined;
      }
    }

    this.hits++;
    this.cache.set(key, {
      ...entry,
      hits: entry.hits + 1,
    });
    return entry.value;
  }

  /**
   * Set a cached prompt.
   */
  set(key: string, value: string, ttl?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const oldest = [...this.cache.entries()]
        .sort(([, a], [, b]) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(key, {
      key,
      value,
      createdAt: new Date().toISOString(),
      ttl: ttl ?? this.config.defaultTTL,
      hits: 0,
    });
  }

  /**
   * Check if a key exists and is still valid.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.ttl > 0) {
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > entry.ttl) {
        this.cache.delete(key);
        return false;
      }
    }
    return true;
  }

  /**
   * Invalidate a cached entry.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const entries = [...this.cache.values()];
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      oldestEntry: entries.length > 0
        ? entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.key ?? null
        : null,
      newestEntry: entries.length > 0
        ? entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.key ?? null
        : null,
    };
  }
}