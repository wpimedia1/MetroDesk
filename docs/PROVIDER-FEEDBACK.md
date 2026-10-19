# Provider Feedback

Three completed live runs are archived in `records/`, with request IDs, latency, token use and Tavily results; see VERIFICATION.md.

## Nebius Token Factory and NVIDIA Nemotron

Model: `nvidia/Nemotron-3-Ultra-550b-a55b`, endpoint `https://api.tokenfactory.nebius.com/v1/chat/completions`, `response_format` type `json_schema`, `strict: true`.

**Nebius Token Factory:** MetroDesk's entire deliberation runs on it. All 21+ structured-output agent calls per run (358 calls across the three recorded deliberations) hit Token Factory's chat-completions endpoint. I have extensive experience with API calls, and when using Claude and similar models the call pattern is synonymous, so there was no learning curve. It was fast considering MetroDesk's call rate. I used the highest-tier model, NVIDIA Nemotron 3 Ultra, specifically to leverage the high context window. That let me skip building a separate retrieval layer, since long documents went straight into each agent's context, and the server checks every quoted passage against them. Several pieces of this project will stay on Token Factory. For structured-output agent inference I'd build on it again.

**Onboarding critique:** distinguishing between AI Cloud and Token Factory wasn't intuitive. I'm used to Google Cloud Console, where everything lives in one UI, and I couldn't successfully call all the listed model endpoints (the Nano models, for example). Once configured, the endpoint itself was reliable. What I'd change: clearer routing between AI Cloud and Token Factory at signup, and verified status for every listed model endpoint. The experience also sparked my interest in the Nebius certification on the site.

## NVIDIA Nemotron 3 Ultra

I used Nemotron 3 Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) for all five agents, with strict json_schema output on every call. Schema adherence was solid: across 358 successful calls in three recorded runs, none returned malformed JSON. The problems were elsewhere. Hidden reasoning counts against `max_tokens`, and 50 calls stopped at the token limit, some after 65,536 completion tokens, so I had to build retries that double the limit automatically. Content accuracy needed heavy policing: my server checks rejected 210 of 358 answers, most often for quoting passages that weren't in the cited source. Prompts averaged about 40,000 tokens, median response time was 11 to 13 seconds, and the slowest call took over 5 minutes. It handles real multi-agent reasoning, but I'd want a way to budget reasoning tokens separately from the answer.

## Tavily

New to me. I'm used to grounding with Google Search on GCS. MetroDesk's agents call Tavily search and extract mid-turn to ground objections in live sources, which removed a whole grounding layer I'd otherwise have hand-built. I plan to dig into the Tavily cookbook next. It's already inspiring a build for the upcoming Meta hackathon.

## Nebius AI Cloud (Serverless)

I didn't use it for this build. Conceptually it reads like Google Cloud Functions, so I can't speak to it from experience.

## Documentation

The documentation was good on both platforms and helpful in explaining which services to use for my goal.
