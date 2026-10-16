# Provider Feedback

Three completed live runs are archived in `records/`, with request IDs, latency, token use and Tavily results; see VERIFICATION.md.

## Nebius Token Factory and NVIDIA Nemotron

Model: `nvidia/Nemotron-3-Ultra-550b-a55b`, endpoint `https://api.tokenfactory.nebius.com/v1/chat/completions`, `response_format` type `json_schema`, `strict: true`.

I used Token Factory for agent prompts and API inference.

Onboarding was confusing: distinguishing between AI Cloud and Token Factory was not intuitive. I'm used to Google Cloud Console, where everything is in the same UI. I wasn't able to successfully call all of the listed model endpoints, for example the Nano models. Once I was up and running, the platform became clearer, but I still feel the split between the two is a mistake. I would avoid this platform, given my Type A need for control. That said, I may look into the Nebius certification I saw on the site.

## NVIDIA Nemotron 3 Ultra

I used Nemotron 3 Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) for all five agents, with strict json_schema output on every call. Schema adherence was solid: across 358 successful calls in three recorded runs, none returned malformed JSON. The problems were elsewhere. Hidden reasoning counts against `max_tokens`, and 50 calls stopped at the token limit, some after 65,536 completion tokens, so I had to build retries that double the limit automatically. Content accuracy needed heavy policing: my server checks rejected 210 of 358 answers, most often for quoting passages that weren't in the cited source. Prompts averaged about 40,000 tokens, median response time was 11 to 13 seconds, and the slowest call took over 5 minutes. It handles real multi-agent reasoning, but I'd want a way to budget reasoning tokens separately from the answer.

## Tavily

Used for search and extract. I used Tavily to ground the LLM for accuracy. It was very easy: no hassle, no failed calls and no hallucinations. I will most likely start using Tavily to ground some of my projects. I have left the Tavily tab open and plan on digging deeper.

## Nebius AI Cloud

Not used. This build has not been deployed on AI Cloud, Serverless Jobs, Serverless Endpoints or DevPods.

## Documentation

The documentation was good on both platforms and helpful in explaining which services to use for my goal.
