# QUORUM

Emergency planners and exercise facilitators need to see why a response proposal changed, what evidence informed it, and which objections remain. QUORUM turns a supplied situation, documents and constraints into an inspectable council transcript and cited decision brief, with proposal history and dissent preserved.

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

An older server is identified by the UI's restart message. Current API version: `quorum-1`.

## Workflow

1. Open a session with situation, documents, decision objective, stakeholders and constraints. Planning exercises produce reconciled integer-dollar allocations; evidence reviews do not require a spending ledger. Either accepts an example situation as its planning premise.
2. The Negotiator proposes. Analyst, Risk, Strategy and Stability receive that proposal and preceding contributions in separate calls, and respond.
3. Participants can request Tavily search or extract for a concrete evidence gap. Actual results return to the requester; identical successful retrievals are reused and labeled.
   Missing evidence follows a fixed path. An agent that cites anything other than an extracted source is told to search for it. Evidence that research cannot supply, or that is internal (inventories, contracts, local data), is filed as an evidence request; public evidence must be searched first. A filed request pauses the session as Evidence needed. The reviewer answers each request in text, attaches a document, or declines; answers become citable sources (R or D IDs) and declines are carried into the determination as unresolved. Resume continues from the next contribution.
4. The Negotiator revises, explicitly addressing or deferring open objections. Only the four reviewers raise objections. Rounds 2 and 3 challenge the previous round's revision directly, so three rounds produce four proposal versions in 21 contributions.
5. Each reviewing agent separately returns support, conditional support or oppose for the final revision. Agreement is computed from those four dispositions. A separate moderator produces the determination.
6. Export the full JSON record or open the readable HTML report containing proposals, transcript, evidence and request records.

The five agents have distinct instructions and persisted participant state. They can use the same underlying model.

## Theater and Outcomes

Brief, Floor, Evidence and Decision are working views. The theater highlights real pending operations and accepted contributions; participant selection opens their contribution history. Sources open with exact cited passages. Recorded replay uses existing messages and makes no provider calls.

Ready, Running, Recovering, Finished, Failed, Stopped, Interrupted and Connection lost remain visible across views. Backend completion opens the Decision view. Connection lost means current status is unknown. Animation and recorded playback cannot overwrite the backend outcome.

Stop aborts the in-flight request. Resume preserves accepted turns and the unfinished operation, including pending research. Server restarts mark active records interrupted. Completion means the determination exists; three revised rounds alone do not block unfinished final votes.

## Architecture and Records

The Node server provides the case API and a reconnectable server-sent state stream. Each saved revision sends an event ID; the browser retrieves authoritative case state and falls back to polling during reconnection.

New cases use `record_version: 2` with `deliberation` participants, messages, proposals, objections, dispositions, operation and determination. Messages reference earlier messages and proposal versions. Provider receipts associate requests with the agent and operation. GET `/api/cases/:id/export` returns JSON; GET `/api/cases/:id/report` returns readable HTML.

Only version 2 deliberation records are loaded; records from the earlier single-model engine are skipped.

Records are local plaintext JSON in `data/`. `data/` is not tracked by Git. When a run ends, it is copied once per revision to `records/` as a read-only file only if it is a good run: it passes acceptance with Tavily research and a cited challenge-to-revision dependency, and has no unverified citations. `records/` is tracked by Git; review it before committing, since it contains the session inputs. Inputs go to Nebius; research queries and URLs go to Tavily. Provider keys are excluded from saved cases, reports and API configuration responses. Accepted messages link to their provider receipt and decision call. New receipts record requested response format, schema name, attempt and correction number alongside returned identifiers, usage and latency.

## Validation and Recovery

Source citations require exact passages in extracted text; snippets are leads. Passage matching does not verify semantic entailment, legal admissibility or the source's truth. Documents and retrieved content are untrusted inputs. The runtime does not execute embedded instructions or claim prompt-injection immunity.

Supplied events, objectives and constraints are the planning premises, not claims agents must prove happened. External research is optional and resolves decision-relevant uncertainties. Uploaded documents are registered as extracted sources with their filename, original upload hash and supplied-document provenance, so agents can cite them without Tavily. Previously appended documents are registered when a v2 session resumes. A supplied-document citation is not independent corroboration. Research and contribution actions have separate schema branches; a proposal cannot be null on a contribution. The same schema is included in the model instructions as well as the API request.

Scenario proposals reconcile headline amounts, reserve, phase items, actor totals and unique ledger IDs. Revisions address or defer recorded objections. Missing evidence and objections can remain unresolved in a completed determination.

Invalid responses feed correction into the unfinished agent turn. Truncation regenerates complete JSON with increasing output allowance, up to 65,536 tokens. Six consecutive invalid answers produce an explicit failure; accepted work remains resumable. Refusals and provider connection errors remain explicit. Each agent turn can use two research actions before contributing, preventing endless research without a response.

## Verification

Inspect an actual saved case without generating or replacing contributions: `node scripts/inspect-recorded-ui.mjs CASE_ID`. This produces desktop/mobile screenshots and diagnostics labeled recorded, read-only inspection. It makes no provider calls and cannot establish new live completion.

Start the current server with `npm start`, then execute acceptance from a second PowerShell terminal. These commands make paid runtime requests through that server; the runner never writes directly into its case store.

```powershell
npm run accept:live -- --case CASE_ID
npm run accept:live -- --brief PATH_TO_BRIEF --require-research
```

Use `--base http://127.0.0.1:4410` for another local port, or `--base https://your-host` for an authenticated deployment. `--brief`, `--mode`, `--title` and `--objective` select a new inquiry. `--case` resumes an existing v2 case, preserving its prior receipts and responses. The runner refuses to take ownership of an already running case and only stops a run matching its own run ID.

JSON, HTML and acceptance-inspection artifacts are written to `artifacts/`. Checks require three rounds, four proposal versions, 21 accepted contributions, four independent reviewer dispositions, a determination and linked successful provider receipts. `--require-research` additionally checks Tavily search/extract receipts and a cited challenge-to-revision dependency. Inspect the actual passages and proposal changes to establish material evidence influence; structural checks alone cannot prove it.

## Submission

Targets Best Apps and Agents and functional Tavily integration. See `docs/SUBMISSION.md`, `docs/DEMO.md` and `docs/PROVIDER-FEEDBACK.md` for delivery status, the under-three-minute demo and factual provider feedback. The deadline is October 30, 2026, at 1 p.m. Eastern.

Public repository: https://github.com/wpimedia1/quorum. The MIT license is included. A judge-accessible working build and a public YouTube video remain outstanding. Review third-party vendor licenses before publishing.

## Hosted Judge Access

Configure provider keys server-side. Set `HOST=0.0.0.0`, `APP_ORIGIN=https://your-host`, `QUORUM_USERNAME` and `QUORUM_PASSWORD`; public binding refuses startup without HTTPS origin and credentials. Built-in HTTP Basic authentication protects the entire application, including API, records and connections. Terminate TLS at a reverse proxy and do not expose the internal HTTP port. Give trusted judges application credentials, never provider keys. The acceptance runner reads these credentials privately from the environment or `.env`.

## Limitations

Software-agent agreement does not represent stakeholder consent. Sharing one model does not establish statistical independence. Scenario assumptions are planning inputs, not verified incident facts. Exact citation matches establish passage provenance, not truth, semantic entailment, document authenticity or legal admissibility. Supplied documents do not independently corroborate their own claims.

Provider receipts reflect returned metadata, not independent billing attestation. This is a shared-session instance for trusted users, not a multi-tenant hosted service.

Rules: https://nebiusglobalaihackathon.devpost.com/rules
Organizer tips: https://nebiusglobalaihackathon.devpost.com/updates/46205-how-to-build-a-winning-project
