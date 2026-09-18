/**
 * MatrixSheet - Reactive DAG (Directed Acyclic Graph) Dependency Engine
 * Implements Kahn's topological sort and cycle detection.
 */

export class ReactiveDAG {
  constructor() {
    this.dependents = new Map(); // A -> Set of cells that depend on A
    this.precedents = new Map(); // A -> Set of cells that A depends on
  }

  setDependencies(cellKey, dependencyList) {
    // Clear old dependencies
    const oldPrecedents = this.precedents.get(cellKey) || new Set();
    oldPrecedents.forEach(dep => {
      if (this.dependents.has(dep)) {
        this.dependents.get(dep).delete(cellKey);
      }
    });

    // Set new precedents
    const newPrecedents = new Set(dependencyList.filter(d => d !== cellKey));
    this.precedents.set(cellKey, newPrecedents);

    // Update dependents
    newPrecedents.forEach(dep => {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep).add(cellKey);
    });
  }

  detectCycle(startKey) {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (curr) => {
      visited.add(curr);
      recursionStack.add(curr);

      const deps = this.precedents.get(curr) || new Set();
      for (const next of deps) {
        if (!visited.has(next)) {
          if (dfs(next)) return true;
        } else if (recursionStack.has(next)) {
          return true; // Cycle found!
        }
      }

      recursionStack.delete(curr);
      return false;
    };

    return dfs(startKey);
  }

  getTopologicalOrder(triggerCellKey) {
    // 1. Collect all downstream affected cells using BFS
    const affected = new Set([triggerCellKey]);
    const queue = [triggerCellKey];

    while (queue.length > 0) {
      const curr = queue.shift();
      const directDependents = this.dependents.get(curr) || new Set();
      directDependents.forEach(dep => {
        if (!affected.has(dep)) {
          affected.add(dep);
          queue.push(dep);
        }
      });
    }

    // 2. Build in-degree map for affected subgraph
    const inDegree = new Map();
    affected.forEach(cell => inDegree.set(cell, 0));

    affected.forEach(cell => {
      const deps = this.precedents.get(cell) || new Set();
      deps.forEach(p => {
        if (affected.has(p)) {
          inDegree.set(cell, inDegree.get(cell) + 1);
        }
      });
    });

    // 3. Kahn's Algorithm
    const kahnQueue = [];
    inDegree.forEach((deg, cell) => {
      if (deg === 0) kahnQueue.push(cell);
    });

    const ordered = [];
    while (kahnQueue.length > 0) {
      const u = kahnQueue.shift();
      ordered.push(u);

      const directDependents = this.dependents.get(u) || new Set();
      directDependents.forEach(v => {
        if (affected.has(v)) {
          inDegree.set(v, inDegree.get(v) - 1);
          if (inDegree.get(v) === 0) {
            kahnQueue.push(v);
          }
        }
      });
    }

    // If ordered length doesn't match affected, cycle is present in subgraph
    if (ordered.length !== affected.size) {
      return { hasCycle: true, order: [] };
    }

    return { hasCycle: false, order: ordered };
  }

  getPrecedents(cellKey) {
    return Array.from(this.precedents.get(cellKey) || []);
  }

  getDependents(cellKey) {
    return Array.from(this.dependents.get(cellKey) || []);
  }
}
