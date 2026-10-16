# Provider Feedback

Three completed live runs are archived in `records/`, with request IDs, latency, token use and Tavily results; see VERIFICATION.md.

## Nebius Token Factory and NVIDIA Nemotron

Model: `nvidia/Nemotron-3-Ultra-550b-a55b`, endpoint `https://api.tokenfactory.nebius.com/v1/chat/completions`, `response_format` type `json_schema`, `strict: true`.

I used Token Factory for agent prompts and API inference.

Onboarding was confusing: distinguishing between AI Cloud and Token Factory was not intuitive. I'm used to Google Cloud Console, where everything is in the same UI. I wasn't able to successfully call all of the listed model endpoints, for example the Nano models. Once I was up and running, the platform became clearer, but I still feel the split between the two is a mistake. I would avoid this platform, given my Type A need for control. That said, I may look into the Nebius certification I saw on the site.

## Tavily

Used for search and extract. I used Tavily to ground the LLM for accuracy. It was very easy: no hassle, no failed calls and no hallucinations. I will most likely start using Tavily to ground some of my projects. I have left the Tavily tab open and plan on digging deeper.

## Nebius AI Cloud

Not used. This build has not been deployed on AI Cloud, Serverless Jobs, Serverless Endpoints or DevPods.

## Documentation

The documentation was good on both platforms and helpful in explaining which services to use for my goal.
