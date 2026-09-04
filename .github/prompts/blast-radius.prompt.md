---
description: "Check which downstream functions/services are affected by a shared-module change — blast radius analysis"
agent: "ask"
---

<!-- STARTER KIT TEMPLATE: replace `<shared-layer-module>` and the spec path below with your own shared-library layout. -->

I'm planning to modify `<shared-layer-module>/{{ input }}`.

Read `specs/functions/dependency-map.md` (or your team's equivalent dependency doc) and search the codebase to identify:
1. Which services/functions import this module
2. What functions/classes they use from it
3. The blast radius (how many services need rebuilding/retesting)
4. Any shared data stores affected
