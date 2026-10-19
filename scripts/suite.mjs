import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';
const deployment=JSON.parse(await fs.readFile('docs/deployment.json','utf8')),c=createClient({chain:studionet});
async function run(mode,id){await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/live.mjs',mode,id],{stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(Error(mode+' '+id+' failed '+code)));});}
async function waitWindow(id,field){const b=JSON.parse(await c.readContract({address:deployment.address,functionName:'get_bounty',args:[id],transactionHashVariant:'LATEST_FINAL'}));const until=b[field]*1000;while(Date.now()<until){console.log('Waiting for',id,field,new Date(until).toISOString());await new Promise(r=>setTimeout(r,Math.min(30000,until-Date.now()+1000)));}}
await run('review','bj-dispute-01');
await run('challenge','bj-dispute-01');
await run('setup','bj-approval-01');await run('setup','bj-rejection-01');await run('setup','bj-unknown-01');
await run('review','bj-approval-01');
await waitWindow('bj-dispute-01','response_deadline');await run('resolve','bj-dispute-01');
await waitWindow('bj-approval-01','challenge_deadline');await run('resolve','bj-approval-01');
await run('review','bj-rejection-01');await run('review','bj-unknown-01');
await waitWindow('bj-rejection-01','challenge_deadline');await run('resolve','bj-rejection-01');
await waitWindow('bj-unknown-01','challenge_deadline');await run('resolve','bj-unknown-01');
const p=JSON.parse(await fs.readFile('docs/live-proof.json','utf8'));
for(const [id,expected] of Object.entries({'bj-dispute-01':'APPROVED','bj-approval-01':'NEEDS_REVIEW','bj-rejection-01':'REJECTED','bj-unknown-01':'NEEDS_REVIEW'})){if(p.cases[id].result?.verdict!==expected)throw Error(id+' unexpected verdict: '+p.cases[id].result?.verdict);}
if(!p.cases['bj-approval-01'].result.reason.includes('Invalid literal quote'))throw Error('Conservative malformed-quotation trace was not established');
const dispute=p.cases['bj-dispute-01'];
if(!dispute.challenged||dispute.responses.length!==1||dispute.reviews.length!==2||!dispute.result.sources.some(s=>s.error==='FETCH_FAILED'))throw Error('Live dispute did not exercise invalid-attachment isolation and a separate response');
if(!Object.values(p.balanceChecks||{}).every(x=>x.recipientCreditVerified&&x.contractDebitVerified)||Object.keys(p.balanceChecks||{}).length<4)throw Error('Native recipient-credit checks are incomplete');
const finalBalance=await c.request({method:'eth_getBalance',params:[deployment.address,'latest']});
p.finalContractBalanceWei=BigInt(finalBalance).toString();const reserved=Object.values(p.cases).reduce((n,b)=>n+BigInt(b.escrow_wei),0n);if(BigInt(finalBalance)!==reserved)throw Error('Escrow balance does not match outstanding recorded reserves');
p.completedAt=new Date().toISOString();await fs.writeFile('docs/live-proof.json',JSON.stringify(p,null,2)+'\n');console.log('Recorded live outcomes verified, including conservative quotation failure. Recipient credits and contract debits verified separately.');
