"""Small behavioral harness, not a GenVM emulator. Nondeterminism and value messages are mocked."""
import sys, types
from datetime import datetime, timezone
class Decorator:
    def __call__(self, f): return f
    @property
    def payable(self): return self
class Contract: pass
class Generic:
    def __class_getitem__(cls, args): return dict
class Array:
    def __class_getitem__(cls, args): return list
class Return:
    def __init__(self, value): self.calldata = value
class Error(Exception): pass
transfers = []
class EVM:
    @staticmethod
    def contract_interface(cls):
        return lambda address: types.SimpleNamespace(emit_transfer=lambda **kw: transfers.append((address, kw['value'])))
message=types.SimpleNamespace(sender_address='0x'+'1'*40,contract_address='0x'+'a'*40,value=100)
raw={'datetime':'2026-10-19T10:00:00+00:00'}
web = {}
prompts=[]
validator=None
def get(url):
    v=web[url]
    return types.SimpleNamespace(status=200,body=(v if isinstance(v,str) else __import__('json').dumps(v)).encode())
def prompt(*a,**kw): return prompts.pop(0)
def run(leader,check):
    global validator
    validator=check
    return leader()
gl=types.SimpleNamespace(Contract=Contract,public=types.SimpleNamespace(write=Decorator(),view=Decorator()),message=message,message_raw=raw,evm=EVM,vm=types.SimpleNamespace(UserError=Error,Return=Return,run_nondet_unsafe=run),eq_principle=types.SimpleNamespace(strict_eq=lambda f:f()),nondet=types.SimpleNamespace(web=types.SimpleNamespace(get=get),exec_prompt=prompt))
sys.modules['genlayer']=types.SimpleNamespace(gl=gl,TreeMap=Generic,DynArray=Array,u256=int,Address=str,__all__=['gl','TreeMap','DynArray','u256','Address'])
