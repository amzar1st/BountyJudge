import {test} from 'node:test';import assert from 'node:assert/strict';import {assertReceipt} from '../src/chain.js';
test('finality alone does not prove execution success',()=>{assert.throws(()=>assertReceipt({status:'FINALIZED',consensus_data:{leader_receipt:{execution_result:'ERROR'}}}));});
test('pending success is not final',()=>{assert.throws(()=>assertReceipt({status:'ACCEPTED',consensus_data:{leader_receipt:{execution_result:'SUCCESS'}}}));});
test('finalized successful leader accepted',()=>{assert.doesNotThrow(()=>assertReceipt({status:'FINALIZED',consensus_data:{leader_receipt:{mode:'leader',execution_result:'SUCCESS'}}}));});
test('absent execution receipts fail closed',()=>{assert.throws(()=>assertReceipt({status:'FINALIZED'}));});
