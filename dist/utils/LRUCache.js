"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = void 0;
class LRUCache {
    constructor(maxSize = 100, ttlSeconds = 60) {
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
        this.maxSize = maxSize;
        this.ttl = ttlSeconds * 1000;
        // background cleanup
        setInterval(() => this.cleanup(), 10000).unref();
    }
    get(key) {
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
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
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
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    size() {
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
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
exports.LRUCache = LRUCache;
