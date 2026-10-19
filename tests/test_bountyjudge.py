import unittest, sys, json, copy
sys.path.insert(0,'tests')
import fake_genlayer as f
from contracts.bountyjudge import BountyJudge, now
OWNER='0x'+'1'*40
DEV='0x'+'2'*40
SHA='a'*40
class Tests(unittest.TestCase):
    def setUp(self):
        f.message.sender_address=OWNER; f.message.value=100
        f.raw['datetime']='2026-10-19T10:00:00+00:00'
        f.web.clear(); f.prompts.clear(); f.transfers.clear()
        self.c=BountyJudge(60); self.c.bounties={}; self.c.ids=[]; self.c.used_prs={}
        self.c.create_bounty('demo','Wallet login','amzar1st/BountyJudge',json.dumps(['Implement a connect button']),now()+3600)
    def get(self): return json.loads(self.c.get_bounty('demo'))
    def time(self,seconds):
        from datetime import datetime,timezone
        f.raw['datetime']=datetime.fromtimestamp(now()+seconds,timezone.utc).isoformat()
    def submit(self):
        f.message.sender_address=DEV
        p={'number':1,'body':self.c.binding_token('demo',DEV),'title':'Add wallet login','state':'open','merged':False,'changed_files':1,'additions':1,'deletions':0,'base':{'repo':{'full_name':'amzar1st/BountyJudge'},'sha':'b'*40},'head':{'sha':SHA,'repo':{'full_name':'amzar1st/BountyJudge'}},'user':{'login':'amzar1st'}}
        u='https://api.github.com/repos/amzar1st/bountyjudge/pulls/1'
        f.web[u]=p
        f.web[u+'/files?per_page=100']=[{'filename':'app.js','status':'added','additions':1,'deletions':0,'patch':'+button.connect()'}]
        f.web['https://raw.githubusercontent.com/amzar1st/BountyJudge/'+SHA+'/app.js']='button.connect()'
        self.c.submit_pr('demo',1,SHA)
    def review(self,outcome='PASS'):
        f.prompts.extend([{'checks':[{'outcome':outcome,'reason':'Code inspected','quotes':[{'source':1,'quote':'button.connect()'}]}]},{'valid':[True]}])
        self.c.review('demo')
    def test_escrow_immutable(self):
        b=self.get(); self.assertEqual(b['escrow_wei'],'100')
        with self.assertRaises(f.Error):self.c.create_bounty('demo','other','a/b','[]',now()+100)
    def test_zero_reward_is_rejected(self):
        f.message.value=0
        with self.assertRaises(f.Error):self.c.create_bounty('zero','No funds','a/b',json.dumps(['A specific requirement']),now()+100)
    def test_third_party_cannot_challenge(self):
        self.submit();self.review();f.message.sender_address='0x'+'3'*40
        with self.assertRaises(f.Error):self.c.challenge('demo','https://raw.githubusercontent.com/amzar1st/bountyjudge/'+SHA+'/app.js')
    def test_expired_claim_is_rejected(self):
        self.time(3600)
        with self.assertRaises(f.Error):self.submit()
    def test_escrow_is_separate_per_bounty(self):
        f.message.value=250;self.c.create_bounty('other','Another task','a/b',json.dumps(['A specific requirement']),now()+100)
        self.time(100);self.c.refund('other');self.assertEqual(f.transfers,[(OWNER,250)]);self.assertEqual(self.get()['escrow_wei'],'100')
    def test_challenge_at_deadline_is_rejected(self):
        self.submit();self.review();self.time(60)
        with self.assertRaises(f.Error):self.c.challenge('demo','https://raw.githubusercontent.com/amzar1st/bountyjudge/'+SHA+'/app.js')
    def test_approved_escrow_cannot_be_refunded(self):
        self.submit();self.review();self.time(60);self.c.finalize('demo');f.message.sender_address=OWNER
        with self.assertRaises(f.Error):self.c.refund('demo')
    def test_wallet_binding_required(self):
        self.submit(); self.assertEqual(self.get()['claimant'],DEV)
    def test_missing_binding_cannot_reserve(self):
        f.message.sender_address=DEV
        with self.assertRaises(f.Error):self.c.submit_pr('demo',1,SHA)
        self.assertEqual(self.get()['state'],'OPEN');self.assertFalse(self.c.used_prs)
    def test_owner_cannot_claim(self):
        with self.assertRaises(f.Error):self.c.submit_pr('demo',1,SHA)
    def test_happy_payout_and_no_double_release(self):
        self.submit();self.review();self.assertEqual(self.get()['result']['verdict'],'APPROVED')
        with self.assertRaises(f.Error):self.c.finalize('demo')
        with self.assertRaises(f.Error):self.c.release_reward('demo')
        self.time(60);self.c.finalize('demo');self.c.release_reward('demo')
        self.assertEqual(f.transfers,[(DEV,100)]);self.assertEqual(self.get()['escrow_wei'],'0')
        with self.assertRaises(f.Error):self.c.release_reward('demo')
    def test_rejection_refunds_only_owner(self):
        self.submit();self.review('FAIL');self.time(60);self.c.finalize('demo')
        with self.assertRaises(f.Error):self.c.refund('demo')
        f.message.sender_address=OWNER;self.c.refund('demo');self.assertEqual(f.transfers,[(OWNER,100)])
        with self.assertRaises(f.Error):self.c.refund('demo')
    def test_evidence_failure_not_rejection(self):
        self.submit();f.web.clear();self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'NEEDS_REVIEW')
        self.time(60);self.c.finalize('demo');self.assertEqual(self.get()['state'],'UNRESOLVED')
        with self.assertRaises(f.Error):self.c.release_reward('demo')
    def test_challenge_response_and_failed_evidence(self):
        self.submit();self.review();f.message.sender_address=OWNER
        u='https://raw.githubusercontent.com/amzar1st/bountyjudge/'+SHA+'/counter.txt'
        self.c.challenge('demo',u)
        with self.assertRaises(f.Error):self.c.review('demo')
        f.message.sender_address=DEV;self.c.respond('demo',u)
        with self.assertRaises(f.Error):self.c.respond('demo',u)
        self.time(60);self.review();self.c.finalize('demo');self.assertEqual(self.get()['state'],'ELIGIBLE');self.assertEqual(sum('error' in x for x in self.get()['result']['sources']),2)
        self.assertEqual(len(self.get()['reviews']),2)
    def test_challenge_url_restrictions(self):
        self.submit();self.review()
        for u in ['https://evil.com/a','https://raw.githubusercontent.com/amzar1st/bountyjudge/main/a','https://raw.githubusercontent.com/amzar1st/bountyjudge/'+SHA+'/../a']:
            with self.assertRaises(f.Error):self.c.challenge('demo',u)
    def test_timeout_recovery(self):
        self.submit();self.time(86400);self.c.recover_timeout('demo');self.assertEqual(self.get()['state'],'UNRESOLVED')
    def test_open_expiry_refund(self):
        with self.assertRaises(f.Error):self.c.refund('demo')
        self.time(3600);self.c.refund('demo');self.assertEqual(f.transfers,[(OWNER,100)])
    def test_changed_head_needs_review(self):
        self.submit();f.web['https://api.github.com/repos/amzar1st/bountyjudge/pulls/1']['head']['sha']='c'*40
        self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'NEEDS_REVIEW')
    def test_oversize_files_fail_closed(self):
        self.submit();f.web['https://api.github.com/repos/amzar1st/bountyjudge/pulls/1']['changed_files']=7
        self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'NEEDS_REVIEW')
    def test_invented_quote_fails(self):
        self.submit();f.prompts.append({'checks':[{'outcome':'PASS','reason':'guess','quotes':[{'source':1,'quote':'fabricated implementation'}]}]})
        self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'NEEDS_REVIEW')
    def test_fenced_model_json(self):
        self.submit();f.prompts.extend(['```json\n'+json.dumps({'checks':[{'outcome':'PASS','reason':'Code inspected','quotes':[{'source':1,'quote':'button.connect()'}]}]})+'\n```','```json\n{"valid":[true]}\n```'])
        self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'APPROVED')
    def test_duplicate_pr(self):
        self.submit();f.message.sender_address=OWNER
        self.c.create_bounty('second','Second task','amzar1st/BountyJudge',json.dumps(['Implement a connect button']),now()+3600)
        f.message.sender_address=DEV
        with self.assertRaises(f.Error):self.c.submit_pr('second',1,SHA)
    def test_validator_disagrees(self):
        self.submit();self.review();result=self.get()['result']
        f.prompts.extend([{'checks':[{'outcome':'FAIL','reason':'Different conclusion','quotes':[{'source':1,'quote':'button.connect()'}]}]},{'valid':[True]}])
        self.assertFalse(f.validator(f.Return(result)))
    def test_validator_agrees_with_grounded_leader(self):
        self.submit();self.review();result=self.get()['result']
        f.prompts.extend([{'checks':result['checks']},{'valid':[True]},{'valid':[True]}])
        self.assertTrue(f.validator(f.Return(result)))
    def test_validator_rejects_forged_leader_quotes(self):
        self.submit();self.review();result=self.get()['result'];result['checks'][0]['quotes'][0]['quote']='invented code quote'
        f.prompts.extend([{'checks':[{'outcome':'PASS','reason':'independent','quotes':[{'source':1,'quote':'button.connect()'}]}]},{'valid':[True]}])
        self.assertFalse(f.validator(f.Return(result)))
    def test_truncated_patch_cannot_approve(self):
        self.submit();f.web['https://api.github.com/repos/amzar1st/bountyjudge/pulls/1/files?per_page=100'][0]['additions']=2
        self.c.review('demo');self.assertEqual(self.get()['result']['verdict'],'NEEDS_REVIEW')
    def test_validator_source_change(self):
        self.submit();self.review();result=self.get()['result'];f.web['https://raw.githubusercontent.com/amzar1st/BountyJudge/'+SHA+'/app.js']='button.disconnect()'
        self.assertFalse(f.validator(f.Return(result)))
if __name__=='__main__':unittest.main()
