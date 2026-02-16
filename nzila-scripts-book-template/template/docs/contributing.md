# Contributing to {{PRODUCT_NAME}}

Thank you for your interest in contributing to {{PRODUCT_NAME}}! This guide
covers everything you need to get started.

## Getting Started

1. Fork the {{REPO_NAME}} repository.
2. Clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/{{REPO_NAME}}.git
   cd {{REPO_NAME}}
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feature/my-change
   ```

## Development Workflow

- Make small, focused commits with clear messages.
- Run the full verification suite before pushing:

  ```bash
  pnpm lint && pnpm type-check && pnpm test && pnpm build
  ```

- Push your branch and open a pull request against `main`.

## Code Style & Linting

- The project uses ESLint and Prettier for code quality.
- Run the linter:

  ```bash
  pnpm lint
  ```

- Fix auto-fixable issues:

  ```bash
  pnpm lint --fix
  ```

- Follow existing patterns in the codebase for consistency.

## Pull Request Process

1. Fill out the PR template completely.
2. Link the relevant issue or task.
3. Ensure all status checks pass.
4. Request a review from a code owner.
5. Address review feedback promptly.
6. Squash-merge once approved.

## Scripts-Book Parity

Every shell script must have a cross-platform counterpart:

- Every `.sh` file **must** have a corresponding `.ps1` file.
- Every `.ps1` file **must** have a corresponding `.sh` file.
- Both scripts must produce equivalent behaviour.
- Place scripts in the `scripts-book/` directory.
