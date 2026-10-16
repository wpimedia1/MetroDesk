# Verification

A recorded run passes acceptance (21 accepted contributions, 4 proposal versions, four votes, a determination and linked provider receipts) and has Tavily search and extract receipts. Unverified citations, unreviewed or disputed objections and declined evidence are disclosed in the record, not grounds for exclusion. Only such runs are copied to `records/`.

After the runs, the text of 68 web sources was deleted from the records: every source that is not a US federal work, statute or regulation text, or openly licensed (Hurricane Quillon 35, Cedar and Iowa River 13, Front Range wildfire 20; listed in `docs/SOURCES.md`). Each deleted text is replaced by a notice; the source keeps its title and URL, and the agents' citations and short quoted passages remain. All other content is unchanged. The figures below describe the runs as recorded. Re-running acceptance on the edited records now reports the citations whose source text was deleted as unverifiable: 19 in Hurricane Quillon and 17 in Front Range wildfire. Cedar and Iowa River still passes.

## Recorded runs

`records/65da1c7b-6d8a-4c20-8399-c87585e0de68-r751.json`: Hurricane Quillon, FDEM cash advance allocation (planning exercise, $46,750,000 budget, 10 counties, $4,675,000 minimum reserve).

- Acceptance: passed. 21 accepted contributions, 4 proposal versions, 4 votes, a determination.
- Provider calls: 145, including 109 successful Nebius Token Factory calls, 30 successful Tavily searches and 6 successful Tavily extracts.
- Votes: Analyst conditional support; Risk, Strategy and Stability oppose. Agreement: contested.
- Model answers: 109, of which 59 were rejected and corrected before acceptance.
- Final ledger: $41,762,012 allocated, $4,987,988 reserve (minimum $4,675,000).
- Disclosed flaws: 103 unresolved issues in the determination; 29 deferred and 7 unreviewed objections; 24 of 144 citations unverified; 28 evidence requests declined by the reviewer; one pause for reviewer triage during the run.

`records/8becb7cf-1f35-4609-b671-e669af35c9ee-r762.json`: Cedar and Iowa River flood fight, state fund allocation (planning exercise, $18,500,000 budget, 8 recipients, $1,850,000 minimum reserve).

- Acceptance: passed. 21 accepted contributions, 4 proposal versions, 4 votes, a determination.
- Provider calls: 144, including 124 successful Nebius Token Factory calls, 16 successful Tavily searches and 4 successful Tavily extracts.
- Model answers: 124, of which 79 were rejected and corrected before acceptance.
- Votes: Analyst support; Risk, Strategy and Stability conditional support. Agreement: conditional.
- Final ledger: $13,320,000 allocated, $5,180,000 reserve (minimum $1,850,000).
- Disclosed flaws: 67 unresolved issues in the determination; 12 deferred, 12 unreviewed and 3 disputed objections (9 verified); 7 of 164 citations unverified; 21 evidence requests declined by the reviewer; six pauses for reviewer triage during the run. The determination text states "Allocate $13.72M" and "Retain $4.93M"; the ledger figures above are authoritative, and the app and report flag the mismatch.

`records/c855e390-17a2-4e05-a7c3-33da270bec43-r795.json`: Front Range wildfire, Disaster Emergency Fund allocation (planning exercise, $9,600,000 budget, 6 counties, $960,000 minimum reserve).

- Acceptance: passed. 21 accepted contributions, 4 proposal versions, 4 votes, a determination.
- Provider calls: 163, including 125 successful Nebius Token Factory calls (one failed), 28 successful Tavily searches and 9 successful Tavily extracts, across 17 run attempts.
- Model answers: 125, of which 72 were rejected and corrected before acceptance.
- Votes: Analyst, Risk, Strategy and Stability oppose. Agreement: contested.
- Final ledger: $8,640,000 allocated, $960,000 reserve (minimum $960,000). The determination text states no dollar figures.
- Disclosed flaws: 85 unresolved issues in the determination; 16 deferred, 8 unreviewed and 9 disputed objections (1 verified, 2 withdrawn); 28 of 97 citations unverified; 23 evidence requests declined by the reviewer; two pauses for reviewer triage during the run.

Published: read-only demo at https://metrodesk.pages.dev/, video at https://youtu.be/8oRJ1qgdlJE, provider feedback in `docs/PROVIDER-FEEDBACK.md`. Not done: AI Cloud deployment (not used).
