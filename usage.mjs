// The live meter. Costs are estimates: provider-reported usage multiplied by configured prices.
// Prices default to the Nebius Token Factory rate for nvidia/Nemotron-3-Ultra-550b-a55b ($1.00 per million input
// tokens, $3.00 per million output tokens) and Tavily pay-as-you-go credits; set them in the environment if they change.
const num=(value,fallback)=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:fallback;};
export function pricingFrom(env={}){
 return {input_usd_per_million:num(env.NEBIUS_INPUT_USD_PER_MILLION,1),output_usd_per_million:num(env.NEBIUS_OUTPUT_USD_PER_MILLION,3),tavily_usd_per_credit:num(env.TAVILY_USD_PER_CREDIT,0.008)};
}
// Usage for one provider receipt. Nebius receipts without usage are counted from characters (about four per token)
// and flagged as estimated.
export function receiptUsage(r,pricing){
 if(r.provider==='Tavily'){const credits=Number.isFinite(r.usage?.credits)?r.usage.credits:r.status==='succeeded'?2:0;return {input_tokens:0,output_tokens:0,credits,cost_usd:credits*pricing.tavily_usd_per_credit,estimated:!Number.isFinite(r.usage?.credits)};}
 const input=Number.isFinite(r.usage?.prompt_tokens)?r.usage.prompt_tokens:Math.ceil((r.request_characters||0)/4);
 const output=Number.isFinite(r.usage?.completion_tokens)?r.usage.completion_tokens:Math.ceil((r.response_characters||0)/4);
 return {input_tokens:input,output_tokens:output,credits:0,cost_usd:input/1e6*pricing.input_usd_per_million+output/1e6*pricing.output_usd_per_million,estimated:!Number.isFinite(r.usage?.prompt_tokens)};
}
// Totals over the receipts this engine produced (receipts carrying a run_engine of 3); earlier receipts are history.
export function sessionUsage(c){
 const pricing=c.pricing||pricingFrom();
 const t={input_tokens:0,output_tokens:0,tavily_credits:0,cost_usd:0,model_calls:0,search_calls:0,extract_calls:0,estimated:false};
 for(const r of c.provider_calls||[]){
  if(r.run_engine!==3||r.status==='pending')continue;
  const u=receiptUsage(r,pricing);
  t.input_tokens+=u.input_tokens;t.output_tokens+=u.output_tokens;t.tavily_credits+=u.credits;t.cost_usd+=u.cost_usd;t.estimated||=u.estimated;
  if(r.provider==='Nebius')t.model_calls++;else if(String(r.endpoint).endsWith('/search'))t.search_calls++;else t.extract_calls++;
 }
 t.tokens=t.input_tokens+t.output_tokens;t.cost_usd=Math.round(t.cost_usd*1e4)/1e4;
 return t;
}
