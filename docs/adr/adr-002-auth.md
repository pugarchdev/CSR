# ADR-002: Authentication and RBAC Strategy

## Status
Approved

## Context
The MahaCSR platform manages financial requests, project proposals, corporate tax-deductibility compliance documentations (80G, 12A, CSR-1), and funding releases. Securing individual access and validating specific permissions is a primary requirement.

## Decision
1. **Access Tokens**: Short-lived JSON Web Tokens (JWT) (15-minute expiry) containing user ID, role, and organization references, transmitted via `Authorization: Bearer <token>` HTTP headers.
2. **Refresh Tokens**: Long-lived tokens (7-day expiry) stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, used exclusively to refresh access tokens.
3. **Multi-Factor Verification (OTP)**: High-security transactions (registration verification, password resets, milestone release requests) will trigger an out-of-band 6-digit OTP verified via SMS/email.
4. **Role-Based Access Control (RBAC)**: Enforced through a generic `authorizeRoles(allowedRoles: Role[])` Express middleware checking the decoded token role field before hitting controllers.
   - *Super Admin*: Direct platform overrides, manual NGO/Company verification updates.
   - *Company Admin / Member*: Manage budgets, inspect project marketplace, chat, approve milestones.
   - *NGO Admin / Member*: Create project proposals, upload certificates, chat, submit milestone proof.

## Consequences
- Mitigates XSS (Cross-Site Scripting) exposure by storing refresh credentials inside browser-inaccessible cookies.
- Prevents CSRF (Cross-Site Request Forgery) using the `SameSite=Strict` parameter.
- Provides strict granular access mapping for API endpoints.
