// @forge/optimization-orchestrator
// Engine registry — resolves engines by type instead of direct imports

import type { Engine, EngineType, IEngineRegistry } from "./types.js";
import { MissingEngineError } from "./errors.js";

export class EngineRegistry implements IEngineRegistry {
  private engines: Map<EngineType, Engine> = new Map();

  register(type: EngineType, engine: Engine): void {
    this.engines.set(type, engine);
  }

  resolve<T extends Engine>(type: EngineType): T {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new MissingEngineError("unknown", type);
    }
    return engine as T;
  }

  has(type: EngineType): boolean {
    return this.engines.has(type);
  }

  list(): EngineType[] {
    return Array.from(this.engines.keys());
  }
}