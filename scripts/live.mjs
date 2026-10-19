import fs from 'node:fs/promises';
import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {assertReceipt,waitForFinalized} from '../src/chain.js';
const deployment=JSON.parse(await fs.readFile('docs/deployment.json','utf8'));
const ownerKey=JSON.parse(await fs.readFile('/tmp/bountyjudge-test-account.json','utf8'));
let devKey;try{devKey=JSON.parse(await fs.readFile('/tmp/bountyjudge-developer.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;devKey={privateKey:generatePrivateKey()};await fs.writeFile('/tmp/bountyjudge-developer.json',JSON.stringify(devKey),{mode:0o600});}
const owner=privateKeyToAccount(ownerKey.privateKey),dev=privateKeyToAccount(devKey.privateKey);
const client=createClient({chain:studionet,account:owner}),developer=createClient({chain:studionet,account:dev});
const save=()=>fs.writeFile('docs/live-proof.json',JSON.stringify(proof,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
let proof;try{proof=JSON.parse(await fs.readFile('docs/live-proof.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;proof={network:'Studionet',contract:deployment.address,owner:owner.address,developer:dev.address,origin:'SDK generated test accounts; browser signing not verified',transactions:[],cases:{},startedAt:new Date().toISOString()};}
if(proof.owner.toLowerCase()!==owner.address.toLowerCase()||proof.developer.toLowerCase()!==dev.address.toLowerCase())throw Error('Live checkpoint signer mismatch; historical fixtures require their original test accounts.');
if(proof.contract!==deployment.address)throw Error('Live checkpoint is for a different deployment');
async function tx(label,method,args,c=client,value=0n){
 let row=proof.transactions.find(r=>r.label===label);
 if(row?.success)return;
 if(row?.receipt&&!row.success)throw Error('Previous execution failed for '+label+'; inspect it before retrying');
 if(!row){const hash=await c.writeContract({address:deployment.address,functionName:method,args,leaderOnly:false,value});row={label,hash,method,args,signer:c.account.address,value:value.toString()};proof.transactions.push(row);await save();console.log('Submitted',label,hash);}
 const receipt=await waitForFinalized(c,row.hash,{retries:160,onRetry:hash=>console.log('Retrying receipt READ only',hash)});
 const lr=receipt.consensus_data?.leader_receipt;row.receipt={status:receipt.status,executions:(Array.isArray(lr)?lr:[lr]).map(r=>({mode:r?.mode,vote:r?.vote,execution_result:r?.execution_result,genvm_result:r?.genvm_result,result:r?.result})),votes:receipt.consensus_data?.votes};await save();assertReceipt(receipt);row.success=true;await save();console.log('Finalized',label);
}
const read=async id=>{for(let i=0;i<3;i++){try{return JSON.parse(await client.readContract({address:deployment.address,functionName:'get_bounty',args:[id],transactionHashVariant:'LATEST_FINAL'}));}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,2000));}}};
const mode=process.argv[2]||'setup';
if(mode==='setup'&&!proof.developerFunded){await developer.request({method:'sim_fundAccount',params:[dev.address,1e20]});proof.developerFunded=true;await save();}
if(mode==='setup'){
 for(const [id,title,req] of [
 ['bj-direct-approval-02','Normalize a handle with a minimal implementation',['Implement normalize_handle(value) that strips surrounding whitespace and lowercases a string.']],
 ['bj-approval-01','Normalize contributor handles',['Implement normalize_handle(value) that strips surrounding whitespace and lowercases a string.']],
 ['bj-dispute-01','Review a challenged implementation',['Implement normalize_handle(value) that strips surrounding whitespace and lowercases a string.']],
 ['bj-rejection-01','Reject a contradicted requirement',['Implement normalize_handle(value) that returns value.upper() without stripping whitespace.']],
 ['bj-unknown-01','Require unavailable runtime evidence',['Provide independently verified proof that normalize_handle was deployed and passed a live wallet integration test.']]]){
 if(process.argv[3]&&process.argv[3]!==id)continue;
 await tx(id+':create','create_bounty',[id,title,'amzar1st/BountyJudge',JSON.stringify(req),Math.floor(Date.now()/1000)+172800],client,10000000000000000n);
 proof.cases[id]=await read(id);}
 await save();console.log(JSON.stringify({developer:dev.address,contract:deployment.address}));
}else{
 const fixture=JSON.parse(await fs.readFile('docs/fixtures.json','utf8'));
 const id=process.argv[3];if(!id)throw Error('Provide case ID');const f=fixture[id];
 if(mode==='review'){
  await tx(id+':submit','submit_pr',[id,f.number,f.head],developer);
  await tx(id+':review','review',[id]);proof.cases[id]=await read(id);await save();console.log('Decision',proof.cases[id].result.verdict);
 }else if(mode==='challenge'){
  await tx(id+':challenge','challenge',[id,f.evidence]);
  await tx(id+':respond','respond',[id,f.responseEvidence||f.evidence],developer);proof.cases[id]=await read(id);await save();console.log('Response deadline',proof.cases[id].response_deadline);
 }else if(mode==='resolve'){
  let b=await read(id);
  if(b.state==='DISPUTED')await tx(id+':dispute-review','review',[id]);
  await tx(id+':finalize','finalize',[id]);b=await read(id);
  const reward=['ELIGIBLE','PAYOUT_REQUESTED'].includes(b.state),recipient=reward?dev.address:owner.address;
  const balances=async()=>({recipient:await client.request({method:'eth_getBalance',params:[recipient,'latest']}),contract:await client.request({method:'eth_getBalance',params:[deployment.address,'latest']})});
  proof.balanceChecks??={};
  let check=proof.balanceChecks[id];
  if(!check){check={recipient,amountWei:b.escrow_wei,before:await balances(),samples:[]};proof.balanceChecks[id]=check;await save();}
  if(reward)await tx(id+':release','release_reward',[id],developer);
  else await tx(id+':refund','refund',[id]);
  if(check.recipientCreditVerified&&check.contractDebitVerified){proof.cases[id]=await read(id);await save();console.log('Transfer already verified',id);process.exit(0);}
  for(let i=0;i<8;i++){
    const after=await balances();check.samples.push({at:new Date().toISOString(),...after});
    check.recipientCreditVerified=BigInt(after.recipient)-BigInt(check.before.recipient)===BigInt(check.amountWei);
    check.contractDebitVerified=BigInt(check.before.contract)-BigInt(after.contract)===BigInt(check.amountWei);
    await save();if(check.recipientCreditVerified&&check.contractDebitVerified)break;
    await new Promise(r=>setTimeout(r,5000));
  }
  if(!check.recipientCreditVerified||!check.contractDebitVerified)throw Error('Transfer emitted but matching recipient credit and contract debit not verified for '+id);
  proof.cases[id]=await read(id);await save();console.log('Final state',proof.cases[id].state);
 }
}
