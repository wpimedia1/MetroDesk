export function providerError(provider, status) {
  if (status === 401) return `${provider} rejected authentication (HTTP 401). ${provider === 'Nebius' ? 'Use a current Token Factory API key, not a Nebius Cloud IAM token.' : 'Use a current Tavily API key.'} Paste only the key, without quotes or a Bearer prefix, in Connections.`;
  if (status === 403) return `${provider} denied access (HTTP 403). Check the key's project permissions and access to the requested resource.`;
  if (status === 402) return `${provider} returned HTTP 402. Check billing and available credits.`;
  if (status === 429) return `${provider} returned HTTP 429. A rate or usage limit was reached. Check provider limits before retrying.`;
  if (status === 404) return `${provider} returned HTTP 404. Check the requested endpoint or model ID against the provider catalog.`;
  return `${provider} returned HTTP ${status}. The request failed; no result was substituted.`;
}
