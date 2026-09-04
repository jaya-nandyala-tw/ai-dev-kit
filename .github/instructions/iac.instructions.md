---
applyTo: "codebase/<iac-module>/**,codebase/<iac-account>/**"
description: "Terraform IaC rules — Lambda artifacts, DynamoDB tables, API Gateway, Step Functions, deploy process. Use when writing or modifying Terraform resources, updating Lambda hashes, or planning infrastructure changes."
---

# IaC Instructions

<!--
  STARTER KIT TEMPLATE — the `applyTo` glob and the module names below are placeholders. Rename
  `<iac-module>` / `<iac-account>` to your own Terraform repo/module layout, and adjust the resource
  types mentioned (DynamoDB, API Gateway, Step Functions, Lambda) to whatever your infra actually uses.
-->

You are working in **Terraform infrastructure** for your organization's platform.

Before generating code, read:
- `specs/iac/constitution.md` — conventions, deploy process, DO NOT list
- `specs/iac/module-inventory.md` — managed resources catalog

## Key Rules
- `<iac-module>` is a **reusable module** consumed by `<iac-account>` (adjust to your own module graph)
- Lambda artifacts referenced by a content-addressable identifier, e.g. commit SHA: `{name}-0.0.1+{sha}.zip`
- All resources must have tags: `Environment`, `Project`, `CostCenter`, `ManagedBy` (adapt to your tagging policy)
- Do NOT hardcode AWS account IDs — use variables or data sources
- Do NOT put environment-specific values in the module — pass as variables
- Deploy: PR → comment "terraform plan" → review → comment "terraform apply" (adapt to your CI's actual trigger convention)
- Promotion: tag push → sequential plan+apply across your environments (e.g. dev/test/staging/prod)
- Always run `tfsec` and `tflint` before committing
- Schema changes to shared data stores require coordination with downstream consumers
