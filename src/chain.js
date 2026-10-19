import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
export const RPC='https://studio.genlayer.com/api';
export const publicClient=createClient({chain:studionet,endpoint:RPC});
export function assertReceipt(receipt){
 const r=receipt.consensus_data?.leader_receipt;
 const rows=Array.isArray(r)?r:r?[r]:[];
 const primary=rows.find(r=>r.mode==='leader')||rows[0];
 if(!['FINALIZED',7,'7'].includes(receipt.status)||primary?.execution_result!=='SUCCESS'||rows.some(r=>r.execution_result!=='SUCCESS'&&!(r.mode==='validator'&&r.vote==='idle'&&r.genvm_result?.error_code==='CONSENSUS_VALIDATOR_QUORUM_REACHED')))throw Error('Transaction did not finalize with successful execution. Inspect its receipt before retrying.');
}
export async function wallet(){
 const provider=window.ethereum;
 if(!provider)throw Error('No injected wallet found. Open this site in MetaMask’s browser, or use a disposable StudioNet test account.');
 const [address]=await provider.request({method:'eth_requestAccounts'});
 if(Number(await provider.request({method:'eth_chainId'}))!==61999){
  try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]});}
  catch(e){if(e.code!==4902)throw e;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0xf22f',chainName:'GenLayer Studionet',nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},rpcUrls:[RPC]}]});await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]});}
 }
 if(!/^0x[0-9a-f]{40}$/i.test(address||'')||Number(await provider.request({method:'eth_chainId'}))!==61999)throw Error('Account or network connection failed.');
 return {address,provider,kind:'Browser wallet',client:createClient({chain:studionet,account:address,provider,endpoint:RPC})};
}
export function testAccount(){
 const account=privateKeyToAccount(generatePrivateKey());
 return {address:account.address,kind:'Disposable test account',client:createClient({chain:studionet,account,endpoint:RPC})};
}
export async function guard(connection){
 if(connection.provider){const p=connection.provider;const ac=await p.request({method:'eth_accounts'});if(ac[0]?.toLowerCase()!==connection.address.toLowerCase()||Number(await p.request({method:'eth_chainId'}))!==61999)throw Error('Wallet account or network changed. Reconnect before signing.');}
}
export async function waitForFinalized(client,hash,{interval=3000,retries=100,retryDelayMs=2000,onRetry=()=>{}}={}){
 for(let attempt=0;attempt<3;attempt++){
  try{return await client.waitForTransactionReceipt({hash,status:'FINALIZED',interval,retries});}
  catch(e){if(attempt===2)throw e;onRetry(hash);await new Promise(r=>setTimeout(r,retryDelayMs));}
 }
}
export async function send(connection,address,functionName,args,value,report){
 await guard(connection);
 const hash=await connection.client.writeContract({address,functionName,args,value,leaderOnly:false});
 if(!/^0x[0-9a-f]{64}$/i.test(hash))throw Error('Invalid transaction hash');
 report(hash,'Submitted. Waiting for consensus and finality.');
 const receipt=await waitForFinalized(connection.client,hash,{onRetry:()=>report(hash,'RPC temporarily unavailable. Still tracking the same submitted transaction.')});
 assertReceipt(receipt);report(hash,'Finalized with successful execution.');return receipt;
}
