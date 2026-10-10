export function parseModelDecision(result){
 const choice=result?.choices?.[0],message=choice?.message;
 const content=typeof message?.content==='string'?message.content:'';
 const finish=choice?.finish_reason||null;
 function fail(code,description){
  const error=Error(description);error.code=code;
  error.diagnostic={code,finish_reason:finish,response_id:typeof result?.id==='string'?result.id:null,content_characters:content.length};
  // Only the returned answer is retained, never a provider's reasoning fields.
  error.diagnostic.response_text=content.slice(0,24000);
  error.diagnostic.response_text_truncated=content.length>24000;
  throw error;
 }
 if(finish==='length')fail('MODEL_OUTPUT_LIMIT','Model output reached its token limit; a complete replacement response is required.');
 if(message?.refusal||finish==='content_filter')fail('MODEL_REFUSAL','Model declined this request. Stopped without an automatic retry.');
 if(!content.trim())fail('INVALID_MODEL_JSON','Model returned no decision content.');
 try{return JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
 catch{fail('INVALID_MODEL_JSON','Model returned malformed decision JSON.');}
}
