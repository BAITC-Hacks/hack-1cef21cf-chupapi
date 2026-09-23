import nextEnv from "@next/env";
import {analyzeWithProvider} from "../lib/ai-server.js";
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const result=await analyzeWithProvider("We want AI to reduce queues in our coffee shops.");
console.log(JSON.stringify({mode:result.mode,message:result.reason,questions:result.analysis.questions.length,questionGroups:result.analysis.questions.map(q=>q.field),unprovidedData:result.analysis.card.data},null,2));
if(result.mode!=="REAL AI")process.exitCode=1;
