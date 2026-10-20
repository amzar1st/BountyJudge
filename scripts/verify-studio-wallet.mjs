import fs from 'node:fs/promises';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {assertReceipt, waitForFinalized} from '../src/chain.js';

// Read-only verification of transactions submitted manually through Studio UI.
const client = createClient({chain: studionet});
const address = '0x46987EFCfe8bC16202D77164E6b6cF618894Aabf';
const account = '0xDaF21E798c054D998f2df528fAEA1Dc5D806FB90';
const hashes = {
  create: '0x9ef34e1b8e22e0b53c8b84b4f5db25278d13579515964867f77d343e681e6fc0',
  refund: '0x88629370cb0f6d32f70f3b4ffc78c57e3d65e7b73d1b603740b1ae015b7ecf5e',
};
const receipts = {};
for (const [method, hash] of Object.entries(hashes)) {
  receipts[method] = await waitForFinalized(client, hash, {retries: 30});
  assertReceipt(receipts[method]);
}
const bounty = JSON.parse(await client.readContract({address, functionName: 'get_bounty', args: ['bj-studio-wallet-01'], transactionHashVariant: 'LATEST_FINAL'}));
const accountBalanceWei = BigInt(await client.request({method: 'eth_getBalance', params: [account, 'latest']}));
const contractBalanceWei = BigInt(await client.request({method: 'eth_getBalance', params: [address, 'latest']}));
const beforeRefundAccountBalanceWei = 9000000000000000000n; // Observed before UI refund submission.
if (bounty.owner !== account.toLowerCase() || bounty.state !== 'REFUND_REQUESTED' || bounty.escrow_wei !== '0') throw Error('Unexpected wallet bounty state');
if (accountBalanceWei - beforeRefundAccountBalanceWei !== BigInt(bounty.reward_wei) || contractBalanceWei !== 0n) throw Error('Refund accounting did not match');
const proof = {checkedAt: new Date().toISOString(), contract: address, network: 'Studionet, chain 61999, simulated GEN', account, origin: 'GenLayer Studio built-in account; both writes submitted through browser UI in Normal (Full Consensus) mode; Simulation Mode unchecked', bounty, hashes, receipts, beforeRefundAccountBalanceWei, accountBalanceWei, contractBalanceWei, observedRefundCreditWei: accountBalanceWei-beforeRefundAccountBalanceWei, scope: 'Studio import, faucet, funded create, read, expired-owner refund. Hosted frontend browser interaction and MetaMask remain unverified.', issues: ['Studio rejected fractional Value (GEN) before submission; integer 1 GEN succeeded.', 'One refund click transport failed; on-chain OPEN state and no new Studio transaction were checked before submitting again.']};
await fs.writeFile('docs/studio-wallet-proof.json', JSON.stringify(proof, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n');
console.log(JSON.stringify({state: bounty.state, accountBalanceWei: accountBalanceWei.toString(), contractBalanceWei: contractBalanceWei.toString(), hashes}));
