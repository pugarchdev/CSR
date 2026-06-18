# ADR-001: Monorepo and Tech Stack Selection

## Status
Approved

## Context
We need to build a high-performance, compliant, and responsive platform connecting NGOs and companies in Maharashtra. The project requires both an API server (Express/TypeScript) and a web frontend (Next.js 16/Tailwind CSS). Managing multiple codebases separately can lead to developer overhead and type mismatches.

## Decision
We will establish a modular directory structure under a single Git workspace (`d:/CSR`):
- `backend/`: An Express.js Node API application written in TypeScript, using Prisma ORM to connect to PostgreSQL.
- `frontend/`: A Next.js 16 (App Router) web application utilizing Tailwind CSS, ShadCN UI components, and Framer Motion for high-fidelity interactive modules.
- `docs/adr/`: Documentation of core engineering principles and architecture records.

This structure allows us to decouple runtime processes (backend running as a API microservice, frontend statically generated/server-rendered in Next.js) while maintaining code proximity.

## Consequences
- **Type Coherence**: Types can be copied or shared between frontend and backend interfaces, ensuring API payload safety.
- **Independent Operations**: We can launch server and client development environments concurrently.
- **Audit Trails**: Simplifies regulatory tracing for deployment pipelines.
