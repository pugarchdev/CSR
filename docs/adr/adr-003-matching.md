# ADR-003: Intelligent Matching Engine Scoring Weights

## Status
Approved

## Context
Companies search for projects that align with their CSR policies, corporate values, geographic target areas, and budget allowances. Manual filtering is tedious and slow, especially with hundreds of projects.

## Decision
We will build a dynamic scoring calculation module (`MatchingService`) that computes a 0-100 score for a company-project pair:
1. **Focus Area & SDG Alignment (35 points)**: Direct string overlap between the company's `focusAreas` array and the project's `focusArea` / `sdgGoal` tags.
2. **Geographic Match (35 points)**: Matches target locations. Exact district and taluka match = 35 pts. District match = 25 pts. State match (default Maharashtra) = 10 pts.
3. **Financial Fit (20 points)**: Ratio comparison. If the requested project budget is less than or equal to 50% of the company's remaining CSR budget, yield full 20 pts. Scored proportionally down if it exceeds the remaining budget.
4. **NGO Performance Metric (10 points)**: Evaluated using past milestone completion success ratios and time-to-completion historical records.

**Performance Caching Strategy**: Since computation is DB read-heavy, results are stored in Redis (key: `matching:companyId`) with a Time-to-Live (TTL) of 10 minutes, invalidated whenever a new project is approved or a company updates its focus profile.

## Consequences
- Highly responsive marketplace matching.
- Read-heavy queries are fully optimized via Redis caching.
