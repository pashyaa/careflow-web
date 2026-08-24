# Version Baseline

Verified for this generated starter on 24 August 2026.

| Technology | Selected baseline | Rationale |
|---|---|---|
| Java | 21 LTS | User-required backend runtime and stable enterprise baseline |
| Spring Boot | 4.1.1 | Current stable project release at generation time |
| PostgreSQL | 18.6 | Current supported minor release of PostgreSQL 18 |
| Node.js | 24 LTS | Latest LTS line recommended for production applications |
| React | 19.2.8 | Latest stable npm release resolved during generation |
| React Router | 7.18.2 | Latest stable npm release resolved during generation |
| Vite | 8.2.2 | Latest stable npm release resolved during generation |
| Vitest | 4.1.11 | Latest stable npm release resolved during generation |

Backend transitive versions are managed by the Spring Boot dependency BOM. Frontend exact versions are recorded in `careflow-web/package-lock.json`.

Official references:

- https://spring.io/projects/spring-boot/
- https://nodejs.org/en/about/previous-releases
- https://react.dev/versions
- https://vite.dev/releases
- https://www.postgresql.org/support/versioning/
