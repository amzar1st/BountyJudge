import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';import {formatEther} from 'viem';
const p=JSON.parse(await fs.readFile('docs/live-proof.json','utf8')),d=JSON.parse(await fs.readFile('docs/deployment.json','utf8'));
const expected={'bj-dispute-01':'APPROVED','bj-approval-01':'NEEDS_REVIEW','bj-rejection-01':'REJECTED','bj-unknown-01':'NEEDS_REVIEW','bj-direct-approval-02':'APPROVED'};
const require=(ok,message)=>{if(!ok)throw Error(message);};
require(p.contract===d.address,'Proof/deployment mismatch');
const local=createHash('sha256').update(await fs.readFile('contracts/bountyjudge.py')).digest('hex');
require(local===d.sourceSha256,'Source changed after deployment');
const code=JSON.parse(await fs.readFile('docs/source-verification.json','utf8'));require(code.onChainSha256===local&&code.contract===p.contract,'On-chain source verification missing');
let successes=0;const rejectedTransactions=[];
for(const t of p.transactions){
 require([7,'7','FINALIZED'].includes(t.receipt?.status),'Unconfirmed transaction: '+t.label);
 const leader=t.receipt.executions.find(r=>r.mode==='leader');
 if(t.success){require(leader?.execution_result==='SUCCESS','Failed execution marked successful: '+t.label);successes++;}
 else{require(t.label==='bj-approval-01:challenge'&&leader?.result?.status==='rollback'&&leader?.result?.payload==='Challenge unavailable','Unexpected failed transaction: '+t.label);rejectedTransactions.push({label:t.label,hash:t.hash,reason:leader.result.payload});}
}
const cases=[];let funded=0n,paid=0n,refunded=0n;
for(const [id,verdict]of Object.entries(expected)){
 const b=p.cases[id];require(b?.result?.verdict===verdict,'Unexpected verdict: '+id);
 const terminal=verdict==='APPROVED'?'PAYOUT_REQUESTED':'REFUND_REQUESTED';require(b.state===terminal&&b.escrow_wei==='0','Escrow remains open: '+id);
 const check=p.balanceChecks?.[id],last=check?.samples?.at(-1);require(last,'Balance evidence missing: '+id);
 const amount=BigInt(b.reward_wei);
 require(BigInt(last.recipient)-BigInt(check.before.recipient)===amount&&BigInt(check.before.contract)-BigInt(last.contract)===amount,'Recipient credit/debit mismatch: '+id);
 funded+=amount;if(verdict==='APPROVED')paid+=amount;else refunded+=amount;
 cases.push({id,verdict,state:b.state,testGen:formatEther(amount),recipientCreditVerified:true,contractDebitVerified:true});
}
const dispute=p.cases['bj-dispute-01'];require(dispute.reviews.length===2&&dispute.challenges.length===1&&dispute.responses.length===1&&dispute.result.sources.some(s=>s.error==='FETCH_FAILED'),'Invalid-attachment challenge/response trace missing');
require(p.cases['bj-approval-01'].result.reason.includes('Invalid literal quote'),'Conservative quote-failure trace missing');
require(p.cases['bj-unknown-01'].result.checks.some(c=>c.outcome==='UNKNOWN'&&c.reason.includes('no evidence')),'Missing-runtime assessment not established');
const client=createClient({chain:studionet}),balance=await client.request({method:'eth_getBalance',params:[d.address,'latest']});
require(BigInt(balance)===0n&&funded===paid+refunded,'Escrow conservation failed');
const audit={contract:d.address,network:'Studionet (simulated GEN)',sourceSha256:local,successfulFinalizedTransactions:successes,rejectedTransactions,cases,totalFundedTestGen:formatEther(funded),paidTestGen:formatEther(paid),refundedTestGen:formatEther(refunded),finalContractBalanceWei:'0',browserWalletVerified:false,checkedAt:new Date().toISOString()};
p.completedAt=audit.checkedAt;p.finalContractBalanceWei='0';await fs.writeFile('docs/live-proof.json',JSON.stringify(p,null,2)+'\n');await fs.writeFile('docs/live-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
