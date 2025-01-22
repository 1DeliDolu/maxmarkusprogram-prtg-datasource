import { CacheItem, CCacheService } from '../types/interfaces';

export class CacheService implements CCacheService {
  private cache: Map<string, CacheItem<any>>;
  private defaultTimeout: number;
// eslint-disable-next-line 
  constructor(defaultTimeoutSeconds: number = 300) {
    this.cache = new Map();
    this.defaultTimeout = defaultTimeoutSeconds;
  }

  has(key: string): boolean {
    return this.isCacheValid(key);
  }

  get<T>(key: string): T | null {
    return this.getCachedData<T>(key);
  }

  set<T>(key: string, data: T): void {
    this.setCacheData(key, data);
  }

  isCacheValid(key: string): boolean {
    const cachedItem = this.cache.get(key);
    if (!cachedItem) {
      return false;
    }

    const isExpired = Date.now() - cachedItem.timestamp > this.defaultTimeout * 1000;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      return entry.data as T;
    }
    
    return null;
  }

  setCacheData<T>(key: string, data: T): void {
    if (!key) {
      return;
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: this.defaultTimeout,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  private isExpired(entry: CacheItem<any>): boolean {
    return Date.now() - entry.timestamp > entry.timeout * 1000;
  }

  public isInCache(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;  
    }

    const now = Date.now();
    if (now - item.timestamp > item.timeout * 1000) {
      this.cache.delete(key); 
      return false;
    }

    return true;
  }

 
  async getCache(url: string): Promise<any> {
    return Promise.resolve(this.getCachedData(this.hashValue(url)));
  }

 
  async setCache(url: string, data: any): Promise<any> {
    const key = this.hashValue(url);
    this.setCacheData(key, data);
    return this.getCache(url);
  }


  private hashValue(str: string): string {
    let hash = 0;
    if (str.length === 0) {
      return hash.toString();
    }
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }
    
    return hash.toString();
  }
}
