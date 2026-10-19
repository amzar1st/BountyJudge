import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';
const d=JSON.parse(await fs.readFile('docs/deployment.json','utf8')),c=createClient({chain:studionet}),id='bj-direct-approval-02';
const read=async()=>JSON.parse(await c.readContract({address:d.address,functionName:'get_bounty',args:[id],transactionHashVariant:'LATEST_FINAL'}));
async function run(mode){await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/live.mjs',mode,id],{stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(Error(mode+' failed '+code)));});}
async function waitFor(field){const b=await read();while(Date.now()/1000<b[field]){console.log('Waiting until',new Date(b[field]*1000).toISOString());await new Promise(r=>setTimeout(r,Math.min(30000,b[field]*1000-Date.now()+1000)));}}
await run('setup');await run('review');let b=await read();
if(b.result.verdict!=='APPROVED'){
 await run('challenge');await waitFor('response_deadline');
}else await waitFor('challenge_deadline');
await run('resolve');b=await read();if(b.result.verdict!=='APPROVED'||b.state!=='PAYOUT_REQUESTED')throw Error('Direct approval not established: '+b.result.verdict);
console.log('Direct approval and recipient credit verified.');
