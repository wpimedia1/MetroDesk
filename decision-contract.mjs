const text=maxLength=>({type:'string',maxLength});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
// Scenario ledger schema for Nebius structured output: https://docs.tokenfactory.nebius.com/ai-models-inference/json
// Every string and array is capped so a complete proposal fits its fixed output budget.
export const LEDGER_LIMITS={phases:3,itemsPerPhase:12,needs:240,rationale:240,purpose:120,narrative:800,assumptions:6,assumption:200,issues:6,issue:240};
export function scenarioSchema(constraints={}){
 const L=LEDGER_LIMITS;
 return object({
  narrative:text(L.narrative),assumptions:{type:'array',items:text(L.assumption),minItems:1,maxItems:L.assumptions},
  budget_usd:{type:'integer',minimum:1,...(constraints.budget_usd?{enum:[constraints.budget_usd]}:{})},
  reserve_usd:{type:'integer',minimum:constraints.minimum_reserve_usd||0},
  allocations:{type:'array',minItems:constraints.actor_count||1,maxItems:constraints.actor_count||20,items:object({actor:text(120),population:{type:'integer',minimum:1},needs:text(L.needs),amount_usd:{type:'integer',minimum:0},rationale:text(L.rationale)})},
  spending_plan:{type:'array',minItems:1,maxItems:L.phases,items:object({id:text(30),label:text(100),total_usd:{type:'integer',minimum:0},items:{type:'array',minItems:1,maxItems:L.itemsPerPhase,items:object({id:text(40),actor:text(120),amount_usd:{type:'integer',minimum:0},purpose:text(L.purpose)})}})},
  unresolved_issues:{type:'array',maxItems:L.issues,items:text(L.issue)}
 });
}
