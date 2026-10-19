import fs from 'node:fs/promises';
import {assertReceipt} from '../src/chain.js';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
const keyPath='/tmp/bountyjudge-test-account.json';
let secret;
try{secret=JSON.parse(await fs.readFile(keyPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;secret={privateKey:generatePrivateKey()};await fs.writeFile(keyPath,JSON.stringify(secret),{mode:0o600});}
const account=privateKeyToAccount(secret.privateKey),client=createClient({chain:studionet,account});
const code=await fs.readFile('contracts/bountyjudge.py','utf8'),sourceSha256=createHash('sha256').update(code).digest('hex');
let record;try{record=JSON.parse(await fs.readFile('docs/deployment.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(record&&record.sourceSha256!==sourceSha256)throw Error('Source changed since deployment. Inspect existing deployment before resubmitting.');
if(!record){await client.request({method:'sim_fundAccount',params:[account.address,1e20]});
 const hash=await client.deployContract({code,args:[60],leaderOnly:false});
 record={network:'Studionet',chainId:61999,rpc:'https://studio.genlayer.com/api',deploymentTx:hash,sourceSha256,deployer:account.address,challengeSeconds:60,accountOrigin:'Generated SDK test account; not Studio built-in or MetaMask',submittedAt:new Date().toISOString()};
 await fs.writeFile('docs/deployment.json',JSON.stringify(record,null,2));console.log('Submitted',hash);}
const receipt=await client.waitForTransactionReceipt({hash:record.deploymentTx,status:'FINALIZED',interval:3000,retries:100});
const leader=receipt.consensus_data?.leader_receipt;
const publicReceipt={status:receipt.status,to_address:receipt.to_address,votes:receipt.consensus_data?.votes,executions:(Array.isArray(leader)?leader:[leader]).map(r=>({mode:r?.mode,vote:r?.vote,execution_result:r?.execution_result,result:r?.result,genvm_result:r?.genvm_result}))};
await fs.writeFile('docs/deployment-receipt.json',JSON.stringify(publicReceipt,(_,v)=>typeof v==='bigint'?v.toString():v,2));
assertReceipt(receipt);
record.address=receipt.to_address||receipt.recipient;
record.config=JSON.parse(await client.readContract({address:record.address,functionName:'get_config',args:[],transactionHashVariant:'LATEST_FINAL'}));
record.finalizedAt=new Date().toISOString();await fs.writeFile('docs/deployment.json',JSON.stringify(record,null,2)+'\n');
await fs.writeFile('public/deployment.json',JSON.stringify(record,null,2)+'\n');console.log('Finalized',record.address);
