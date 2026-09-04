---
description: "Trace a feature's data flow end-to-end from UI through backend, function, and storage"
agent: "ask"
---

<!-- STARTER KIT TEMPLATE: the layers below assume a UI + API + serverless-function + DB stack. Edit
     this list to match your own architecture's actual layers before relying on it. -->

Trace the complete data flow for: **{{ input }}**

Show the path from:
1. UI component → API call
2. API router → service → external system/DB
3. Function handler (if applicable) → data store / workflow orchestration
4. Response back to UI

Include file paths for each layer.
