# QUORUM submission

Working description: QUORUM is a deliberation theater for emergency planners and exercise facilitators. It conducts separate agent proposals, evidence checks, challenges, revisions and final dispositions, and exports the decision, dissent and sources.

Primary track: Best Apps and Agents. Bonus target: Best Use of Tavily. No participation-count or winning-probability claim is supported.

Built With draft: Node.js, Three.js, NVIDIA Nemotron, Nebius Token Factory, Tavily. AI Cloud is not listed because no AI Cloud deployment has been performed. The Devpost fields are not yet published.

Public repository: https://github.com/wpimedia1/quorum (MIT license).

## Completed

- Versioned, persisted agent messages, proposal versions, objections, dispositions and determination.
- Node API, real provider transport, request receipts, reconnectable state stream, pause/resume, reviewer evidence requests and exports.
- Three.js theater, Brief/Floor/Evidence/Decision views, participant selection, recorded replay and persistent outcomes.
- MIT license, reproducible npm setup and demo script.

## Remaining

- A good run: a fresh, uninterrupted live session that passes research acceptance with no unverified citations.
- Judge-accessible application or test-build URL. A localhost URL is not publicly accessible.
- Public YouTube video under three minutes, recorded from the working application; see DEMO.md.
- First-person onboarding and provider feedback; see PROVIDER-FEEDBACK.md.

The submission deadline is October 30, 2026, at 1 p.m. Eastern. Source: https://nebiusglobalaihackathon.devpost.com/rules

## Judge access

For judge access, deploy an authenticated HTTPS instance with provider keys configured server-side. QUORUM_USERNAME and QUORUM_PASSWORD protect the entire application; non-loopback binding refuses startup without credentials and an HTTPS APP_ORIGIN. A reverse proxy must terminate TLS, and its internal HTTP port must not be exposed. Judges receive application credentials, not provider keys. This is a shared-session instance for trusted judges, not a multi-tenant service. Public hosting has not been performed.

Organizer guidance: https://nebiusglobalaihackathon.devpost.com/updates/46205-how-to-build-a-winning-project
