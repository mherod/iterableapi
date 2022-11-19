/**
 * MyLRUCache is just a wrapper around the LRU cache library
 */

import LRU from "lru-cache";

type Options = {
  max?: number;
  maxAge?: number;
  ttl?: number
};

export default class MyLRUCache<K, V> {
  private readonly cache: LRU<string, any>;

  constructor({ max, maxAge }: Options) {
    const options: LRU.Options<any, any> = {
      max: max,
      maxAge: maxAge,
      ttl: maxAge
    };
    this.cache = new LRU(options);
  }

  public has(email: string) {
    return this.cache.has(email);
  }

  public get(key: string): any {
    return this.cache.get(key);
  }

  public set(key: string, value: any): void {
    this.cache.set(key, value);
  }
}
