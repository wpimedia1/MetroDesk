# MetroDesk

Emergency planners and exercise facilitators need to see why a response proposal changed, what evidence informed it, and which objections remain. MetroDesk turns a supplied situation, documents and constraints into an inspectable council transcript and cited decision brief, with proposal history and dissent preserved.

Five software agents use NVIDIA Nemotron through Nebius Token Factory in separate calls. Tavily supplies research and source extraction. The Three.js theater shows the actual speaker and execution state beside readable contributions.

## Run

Requires Node.js 22.13 or newer.

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm start
```

Open http://127.0.0.1:4400/. Configure server-side Nebius Token Factory and Tavily keys in `.env`, environment variables or Connections. Password fields stay blank for replacement; blank saves retain existing credentials. Configuration is distinct from a successful inference request.

`.env.example` is a public template; `.env` is the private local configuration and is ignored by Git. Never commit provider keys. The default model is `nvidia/Nemotron-3-Ultra-550b-a55b`. Catalog access does not verify inference.

If port 4400 already belongs to your application, stop that instance before restarting the updated server. Alternatively run on another port:

```powershell
$env:PORT = "4401"
npm start
```

An older server is identified by the UI's restart message. Current API version: `metrodesk-1`.

## Workflow

1. Open a session with situation, documents, decision objective, stakeholders and constraints. Planning exercises produce reconciled integer-dollar allocations; evidence reviews do not require a spending ledger. Either accepts an example situation as its planning premise.
2. At the start of each round the server researches once for every agent: one Tavily search and one extract of the top two results per agent, all five in parallel, cached and reused for identical requests. The query comes from the agent's mandate and the decision objective, from its most severe open objection in later rounds, or from its open public evidence request. Agents never drive a search loop.
3. The Negotiator proposes. Analyst, Risk, Strategy and Stability challenge that same proposal at the same time, in separate calls, each with its own research and the supplied documents. Missing evidence is filed as an evidence request and the run continues; a person can answer or decline any request at any time, including during the run, and later turns cite the answer (R or D IDs). Requests still open at the end are listed in the determination.
4. The Negotiator revises, addressing or deferring each open objection. An addressed objection points to the numbered changes in that revision. Only the four reviewers raise objections, and only in challenge turns. In its next turn, the reviewer who raised an objection marks each addressed resolution verified or rejected; a rejection reopens the objection in a challenge, or records it as disputed in a final vote. Rounds 2 and 3 challenge the previous round's revision, so three rounds produce four proposal versions and 21 contributions in nine sequential steps.
5. The four reviewers vote on the final revision at the same time: support, conditional support or oppose. Agreement is computed from those four dispositions. A separate moderator writes the determination.
6. Export the full JSON record or open the readable HTML report containing proposals, transcript, evidence and request records.

The five agents have distinct instructions and persisted participant state. They can use the same underlying model.

## Theater and Outcomes

Brief, Floor, Evidence and Decision are working views. The theater highlights real pending operations and accepted contributions; participant selection opens their contribution history. Sources open with exact cited passages. Recorded replay uses existing messages and makes no provider calls.

Ready, Running, Finished, Failed, Stopped, Interrupted and Connection lost remain visible across views. While a step runs, the status names every agent in flight; the status band shows the current step of nine and an estimated finish time. Backend completion opens the Decision view. Connection lost means current status is unknown. Animation and recorded playback cannot overwrite the backend outcome.

Stop cancels the requests in flight. Resume keeps every accepted contribution and completed research and continues with the unfinished step. Server restarts mark active records interrupted. Completion means the determination exists; three revised rounds alone do not block unfinished final votes.

## Architecture and Records

The Node server provides the case API and a reconnectable server-sent state stream. Each saved revision sends an event ID; the browser retrieves authoritative case state and falls back to polling during reconnection.

New cases use `record_version: 2` with `deliberation` participants, messages, proposals, objections, dispositions, operation and determination. Messages reference earlier messages and proposal versions. Provider receipts associate requests with the agent and operation. GET `/api/cases/:id/export` returns JSON; GET `/api/cases/:id/report` returns readable HTML.

Only version 2 deliberation records are loaded; records from the earlier single-model engine are skipped.

Records are local plaintext JSON in `data/`. `data/` is not tracked by Git. When a run ends, it is copied once per revision to `records/` as a read-only file if it is a completed live run: it passes acceptance (21 contributions, four proposal versions, four votes, a determination and linked provider receipts) and used Tavily search and extract. Its flaws are kept, not filtered: unverified citations, unreviewed or disputed objections and declined evidence stay in the record and the determination. `records/` is tracked by Git; review it before committing, since it contains the session inputs. Inputs go to Nebius; research queries and URLs go to Tavily. Provider keys are excluded from saved cases, reports and API configuration responses. Accepted messages link to their provider receipt and decision call. New receipts record requested response format, schema name, attempt and correction number alongside returned identifiers and latency.

## Validation and Repair

Source citations require exact passages in extracted text; snippets are leads. Passage matching does not verify semantic entailment, legal admissibility or the source's truth. Documents and retrieved content are untrusted inputs. The runtime does not execute embedded instructions or claim prompt-injection immunity.

Supplied events, objectives and constraints are the planning premises, not claims agents must prove happened. Uploaded documents are registered as extracted sources with their filename, original upload hash and supplied-document provenance, so agents can cite them. A supplied-document citation is not independent corroboration. The response schema is one flat object per turn type, sent both as the structured-output format and in the instructions, with a length cap on every field and list.

Bounded output. Nemotron 3 reasons before answering, and its reasoning counts against the output budget, so every turn has the same fixed 16,384-token budget. A reply cut off at its budget is retried once at the same budget with an instruction to answer more briefly; the budget never grows.

Repair instead of reject. Only a reply that is not valid JSON for its turn is rejected and retried, at most three attempts in all. Everything else is corrected on the first try and each correction is recorded on the message and in the report:

- The server writes every number. Models write line items; phase totals, allocations and the reserve are derived from them. Spending above what the minimum reserve allows is scaled down proportionally. Prose uses placeholders ({{allocated}}, {{reserve}}, {{actor:Name}} and so on) that the server fills from the ledger, and any allocated or reserve figure that contradicts the ledger is replaced.
- A misquote is replaced by the closest passage in the source when they share at least 70% of their words, and otherwise marked unverified and not counted as evidence.
- Out-of-range change references are ignored, an addressed resolution with no valid reference is carried as deferred, resolutions of unknown objections are dropped, omitted objections are deferred, and missing reviews are recorded as unreviewed.

Time limits and progress. Each model request is cancelled after 120 seconds and each Tavily request after 60 seconds, then retried (`METRODESK_MODEL_TIMEOUT_MS`, `METRODESK_RESEARCH_TIMEOUT_MS`). The status band shows the current step of nine and an estimated finish time.

Each model request is bounded to 160,000 characters: the documents, this round's research excerpts (8,000 characters each), the current proposal and ledger, open objections and a compact history. Measured on the Front Range wildfire brief with the simulated provider, requests average about 41,000 characters (about 10,000 tokens).

## Verification

`npm test` runs the engine offline against a simulated Nebius and Tavily backend (`test/simulated-provider.mjs`, used only by the tests): a full unattended run in nine steps that passes acceptance, cut-off and invalid replies, quote, reference and ledger repairs, evidence answered mid-run, call timeouts, upstream errors and stop. It makes no network requests.


Inspect an actual saved case without generating or replacing contributions: `node scripts/inspect-recorded-ui.mjs CASE_ID`. Set `BUNDLED_MODULES` to a `node_modules` directory that contains Playwright; `CHROME_PATH` overrides the default Chrome location. This produces desktop/mobile screenshots and diagnostics labeled recorded, read-only inspection. It makes no provider calls and cannot establish new live completion.

Start the current server with `npm start`, then execute acceptance from a second PowerShell terminal. These commands make paid runtime requests through that server; the runner never writes directly into its case store.

```powershell
npm run accept:live -- --case CASE_ID
npm run accept:live -- --brief PATH_TO_BRIEF --require-research
```

Use `--base http://127.0.0.1:4410` for another local port, or `--base https://your-host` for an authenticated deployment. `--brief`, `--mode`, `--title` and `--objective` select a new inquiry. `--case` resumes an existing v2 case, preserving its prior receipts and responses. The runner refuses to take ownership of an already running case and only stops a run matching its own run ID.

JSON, HTML and acceptance-inspection artifacts are written to `artifacts/`. Checks require three rounds, four proposal versions, 21 accepted contributions in step order (any order within a parallel step), four independent reviewer dispositions, a determination and linked successful provider receipts. `--require-research` additionally checks Tavily search/extract receipts and a cited challenge-to-revision dependency. Inspect the actual passages and proposal changes to establish material evidence influence; structural checks alone cannot prove it.

## Submission

Targets Best Apps and Agents and functional Tavily integration. See `docs/SUBMISSION.md`, `docs/DEMO.md` and `docs/PROVIDER-FEEDBACK.md` for delivery status, the under-three-minute demo and factual provider feedback. The deadline is October 30, 2026, at 1 p.m. Eastern.

Public repository: https://github.com/wpimedia1/MetroDesk. The MIT license is included. A judge-accessible working build and a public YouTube video remain outstanding. Review third-party vendor licenses before publishing.

## Hosted Judge Access

Configure provider keys server-side. Set `HOST=0.0.0.0`, `APP_ORIGIN=https://your-host`, `METRODESK_USERNAME` and `METRODESK_PASSWORD`; public binding refuses startup without HTTPS origin and credentials. Built-in HTTP Basic authentication protects the entire application, including API, records and connections. Terminate TLS at a reverse proxy and do not expose the internal HTTP port. Give trusted judges application credentials, never provider keys. The acceptance runner reads these credentials privately from the environment or `.env`.

## Limitations

Software-agent agreement does not represent stakeholder consent. Sharing one model does not establish statistical independence. Scenario assumptions are planning inputs, not verified incident facts. Exact citation matches establish passage provenance, not truth, semantic entailment, document authenticity or legal admissibility. Supplied documents do not independently corroborate their own claims.

Provider receipts reflect returned metadata, not independent billing attestation. This is a shared-session instance for trusted users, not a multi-tenant hosted service.

Rules: https://nebiusglobalaihackathon.devpost.com/rules
Organizer tips: https://nebiusglobalaihackathon.devpost.com/updates/46205-how-to-build-a-winning-project
