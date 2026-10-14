const string={type:'string',maxLength:600};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
// Scenario ledger schema for Nebius structured output: https://docs.tokenfactory.nebius.com/ai-models-inference/json
export function scenarioSchema(constraints={}){
 return object({
  narrative:{type:'string',maxLength:1600},assumptions:{type:'array',items:{type:'string',maxLength:240},minItems:1,maxItems:10},
  budget_usd:{type:'integer',minimum:1,...(constraints.budget_usd?{enum:[constraints.budget_usd]}:{})},
  reserve_usd:{type:'integer',minimum:constraints.minimum_reserve_usd||0},
  allocations:{type:'array',minItems:constraints.actor_count||1,maxItems:constraints.actor_count||20,items:object({actor:string,population:{type:'integer',minimum:1},needs:string,amount_usd:{type:'integer',minimum:0},rationale:string})},
  spending_plan:{type:'array',minItems:1,maxItems:4,items:object({id:{type:'string',maxLength:30},label:{type:'string',maxLength:100},total_usd:{type:'integer',minimum:0},items:{type:'array',minItems:1,maxItems:20,items:object({id:{type:'string',maxLength:40},actor:{type:'string',maxLength:120},amount_usd:{type:'integer',minimum:0},purpose:{type:'string',maxLength:180}})}})},
  unresolved_issues:{type:'array',maxItems:10,items:{type:'string',maxLength:300}}
 });
}
