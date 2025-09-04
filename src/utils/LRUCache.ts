type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};
 
export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private ttl: number; // ms
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 100, ttlSeconds: number = 60) {
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;

    // background cleanup
    setInterval(() => this.cleanup(), 10_000).unref();
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      // stale entry
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // refresh LRU order: delete + set moves to end
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // evict LRU (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.cache.size;
  }

  stats() {
    return {
      size: this.size(),
      hits: this.hits,
      misses: this.misses,
      ttlSeconds: this.ttl / 1000,
    };
  }


//Implement a mechanism to automatically clear stale cache entries using a background task. 
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
