// ============================================
// SIMPLE JSON STORE
// Reads/writes a JSON file for persistence
// ============================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export class Store<T> {
  private data: T;
  private path: string;

  constructor(path: string, defaultData: T) {
    this.path = path;

    // Ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Load existing data or use defaults
    if (existsSync(path)) {
      try {
        this.data = JSON.parse(readFileSync(path, "utf-8"));
      } catch {
        this.data = defaultData;
      }
    } else {
      this.data = defaultData;
    }
  }

  get(): T {
    return this.data;
  }

  set(data: T): void {
    this.data = data;
    this.save();
  }

  update(fn: (data: T) => T): void {
    this.data = fn(this.data);
    this.save();
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }
}
