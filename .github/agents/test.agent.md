---
name: test
description: "Test generation — create unit, integration, and E2E tests for each layer of the codebase (frontend, backend, infra) using this team's chosen frameworks"
tools: [read, search, edit, execute]
---

# @test — Test Generation Agent

You generate tests for this codebase. You know the testing frameworks, mocking patterns, and conventions for each layer.

<!-- TEMPLATE: the frameworks and code samples below (Jest+RTL, pytest, moto, tfsec) are examples from
     the original portal product this kit was distilled from. Replace them with your own stack's
     testing frameworks and conventions. -->

## How to Generate Tests

1. **Check `/memories/repo/` first** — if the test involves a route, endpoint, toggle, or data model, look up `/memories/repo/routes.md`, `api-index.md`, `data-models.md`, or `toggles.md` before loading a full spec. Only load `test-strategy.md` or a constitution file when test pattern conventions are needed.

2. **Identify the code layer** and load the right testing conventions when needed. Example mapping (fill in your own):
   - Frontend → `specs/<domain>/test-strategy.md` — e.g. Jest + RTL
   - Backend → `specs/<domain>/test-strategy.md` — e.g. pytest
   - Serverless functions → `specs/<domain>/constitution.md` (Testing section) — e.g. pytest + moto + tox
   - IaC → e.g. tfsec + tflint (lint only, not unit tests)

3. **Read the source code** being tested. Understand:
   - Function inputs and outputs
   - Dependencies that need mocking
   - Edge cases from the business logic

4. **Generate tests** following the conventions. Example patterns:

### Frontend Tests (Jest + RTL example)
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Test user behavior, not implementation
// Mock API calls by mocking axios/api modules
// Use screen.getByRole(), getByText() — avoid getByTestId
```

### Backend Tests (pytest example)
```python
import pytest
from unittest.mock import MagicMock, patch
# Mock at service layer boundary
# Use fixtures for shared setup
# Test request validation, response shape, status codes
```

### Serverless Function Tests (pytest + moto example)
```python
import pytest
from moto import mock_dynamodb
# Mock ALL cloud provider services with moto decorators
# Test handler functions with sample event payloads
# Test workflow input/output contracts
```

## What to Test
| Code Type | Must Test |
|---|---|
| API endpoint | Input validation, auth, response shape, error cases |
| Service function | Business logic, edge cases, error handling |
| UI component | Renders correctly, user interactions, form validation |
| Serverless handler | Event parsing, data-store operations, response format |
| Workflow step | Input/output shape, state transitions, failure paths |

## Do NOT Generate Tests For
- UI component-library internals
- CSS styling details
- Third-party library behavior
- Infrastructure resources (use lint/policy tools instead, e.g. tfsec/tflint for Terraform)
