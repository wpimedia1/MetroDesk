# Verification

A recorded run passes acceptance (21 accepted contributions, 4 proposal versions, four votes, a determination and linked provider receipts) and has Tavily search and extract receipts. Unverified citations, unreviewed or disputed objections and declined evidence are disclosed in the record, not grounds for exclusion. Only such runs are copied to `records/`.

## Recorded run

`records/65da1c7b-6d8a-4c20-8399-c87585e0de68-r751.json`: Hurricane Quillon, FDEM cash advance allocation (planning exercise, $46,750,000 budget, 10 counties, $4,675,000 minimum reserve).

- Acceptance: passed. 21 accepted contributions, 4 proposal versions, 4 votes, a determination.
- Provider calls: 145, including 109 successful Nebius Token Factory calls, 30 successful Tavily searches and 6 successful Tavily extracts.
- Votes: Analyst conditional support; Risk, Strategy and Stability oppose. Agreement: contested.
- Disclosed flaws: 103 unresolved issues in the determination; 29 deferred and 7 unreviewed objections; 24 of 144 citations unverified; one pause for reviewer triage during the run.

## Run engine 3 (current)

The recorded run above was produced by the earlier sequential engine; it still passes the current acceptance check (`npm test` verifies this). The current engine runs nine steps with parallel challenges and votes, server research once per agent per round, fixed output budgets, repair instead of rejection and non-blocking evidence. It is verified offline by `npm test` against a simulated provider; no live run of engine 3 has been recorded yet.

Not done: a recorded live run of engine 3, judge-accessible URL, YouTube video, AI Cloud deployment, author provider feedback.
