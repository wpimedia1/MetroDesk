export function checkScenario(value, constraints = {}, {requirePlan=false} = {}) {
  const errors = [];
  if (!value || typeof value !== 'object') return {valid:false,errors:['Supply a scenario object.']};
  const allocations = Array.isArray(value.allocations) ? value.allocations : [];
  const amount = value.budget_usd;
  if (!Number.isSafeInteger(amount) || amount <= 0) errors.push('budget_usd must be a positive integer in dollars.');
  if (constraints.budget_usd && amount !== constraints.budget_usd) errors.push(`Budget must equal the reviewer limit of ${constraints.budget_usd} dollars.`);
  if (constraints.actor_count && allocations.length !== constraints.actor_count) errors.push(`Provide exactly ${constraints.actor_count} actor allocations.`);
  if (!allocations.length || allocations.length > 20) errors.push('Provide between 1 and 20 actor allocations.');
  const names = new Set();
  for (const a of allocations) {
    if (!a || typeof a !== 'object') {errors.push('Invalid allocation row.');continue;}
    if (typeof a.actor !== 'string' || !a.actor.trim() || names.has(a.actor.trim().toLowerCase())) errors.push('Each actor needs a unique name.');
    else names.add(a.actor.trim().toLowerCase());
    if (!Number.isSafeInteger(a.amount_usd) || a.amount_usd < 0) errors.push('Each allocation must be a nonnegative integer in dollars.');
    if (!Number.isSafeInteger(a.population) || a.population <= 0) errors.push('Each actor needs a positive integer population.');
    if (typeof a.needs !== 'string' || !a.needs.trim() || typeof a.rationale !== 'string' || !a.rationale.trim()) errors.push('Each actor needs damage/needs and an allocation rationale.');
  }
  if (!Number.isSafeInteger(value.reserve_usd) || value.reserve_usd < 0) errors.push('reserve_usd must be a nonnegative integer in dollars.');
  if (Number.isSafeInteger(constraints.minimum_reserve_usd) && value.reserve_usd < constraints.minimum_reserve_usd) errors.push(`Reserve must be at least ${constraints.minimum_reserve_usd} dollars.`);
  const allocated = allocations.reduce((sum,a)=>sum+(Number.isSafeInteger(a?.amount_usd)?a.amount_usd:0),0);
  if (!Number.isSafeInteger(allocated) || allocated + value.reserve_usd !== amount) errors.push('Allocations plus reserve must exactly equal budget_usd.');
  if (typeof value.narrative !== 'string' || !value.narrative.trim()) errors.push('Supply a completed scenario narrative.');
  if (!Array.isArray(value.assumptions) || !value.assumptions.length || value.assumptions.some(a=>typeof a!=='string'||!a.trim())) errors.push('Explicitly list simulated assumptions.');
  const detailed=checkSpendingPlan(value);
  if(requirePlan||value.spending_plan!==undefined)errors.push(...detailed.errors);
  if(requirePlan&&(!Array.isArray(value.unresolved_issues)||value.unresolved_issues.some(x=>typeof x!=='string'||!x.trim())))errors.push('Provide unresolved_issues as an array of nonempty strings, or an empty array.');
  return {valid:errors.length===0,errors,allocated_usd:allocated,total_usd:allocated+(value.reserve_usd||0),detail_check:detailed};
}

export function checkSpendingPlan(value){
 const errors=[],phases=value?.spending_plan,totals=new Map(),ids=new Set(),phaseIds=new Set();let total=0;
 if(!Array.isArray(phases)||!phases.length)return {valid:false,errors:['Supply a structured spending_plan covering all allocated dollars; reserve stays separate.'],total_usd:0};
 const allocations=Array.isArray(value.allocations)?value.allocations:[];
 for(const [index,phase] of phases.entries()){
  const label=`Phase ${index+1}`;
  if(!phase||typeof phase!=='object'){errors.push(`${label} is invalid.`);continue;}
  if(typeof phase.id!=='string'||!phase.id.trim()||phaseIds.has(phase.id))errors.push(`${label} needs a unique phase id.`);
  phaseIds.add(phase.id);
  if(typeof phase.label!=='string'||!phase.label.trim())errors.push(`${label} needs a label.`);
  const items=Array.isArray(phase.items)?phase.items:[];let subtotal=0;
  if(!items.length)errors.push(`${label} needs spending items.`);
  for(const item of items){
   if(!item||typeof item!=='object'){errors.push(`${label} has an invalid item.`);continue;}
   if(typeof item.id!=='string'||!item.id.trim()||ids.has(item.id))errors.push(`${label}: duplicate or missing spending item id ${String(item.id)}.`);
   ids.add(item.id);
   if(!allocations.some(a=>a?.actor===item.actor))errors.push(`${label}: unknown allocation actor ${String(item.actor)}.`);
   if(!Number.isSafeInteger(item.amount_usd)||item.amount_usd<0){errors.push(`${label}: item ${item.id} requires nonnegative integer dollars.`);continue;}
   if(typeof item.purpose!=='string'||!item.purpose.trim())errors.push(`${label}: item ${item.id} needs a purpose.`);
   subtotal+=item.amount_usd;totals.set(item.actor,(totals.get(item.actor)||0)+item.amount_usd);
  }
  if(!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(phase.total_usd)||phase.total_usd!==subtotal)errors.push(`${label}: declared total ${phase.total_usd} must equal item total ${subtotal} dollars.`);
  total+=subtotal;
 }
 for(const a of allocations)if(a&&totals.get(a.actor)!==a.amount_usd)errors.push(`${a.actor}: spending items total ${totals.get(a.actor)||0} but allocation is ${a.amount_usd} dollars.`);
 if(!Number.isSafeInteger(total)||total+value.reserve_usd!==value.budget_usd)errors.push(`Spending items (${total}) plus reserve (${value.reserve_usd}) must equal budget (${value.budget_usd}) dollars.`);
 return {valid:!errors.length,errors,total_usd:total};
}

export function scenarioReview(round){
 const issues=[...(round.scenario?.unresolved_issues||[]),...(round.budget_check?.detail_check?.errors||[])];
 for(const f of round.findings||[])if(f.status==='unresolved')issues.push(`Unresolved evidence: ${f.claim}`);
 return {status:issues.length?'unresolved':'reconciled',summary:issues.length?'Simulation proposal has unresolved issues.':'Structured simulation spending reconciled.',issues,scope:'Checks cover structured dollar totals and references, not every narrative claim or assumption.'};
}
