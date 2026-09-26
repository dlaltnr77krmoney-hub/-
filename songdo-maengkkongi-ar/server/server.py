"""Songdo local/shared prototype server. Python 3.11+, standard library only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from pathlib import Path
import argparse, contextlib, json, mimetypes, os, re, secrets, sqlite3, threading, time
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app'
LOCK = threading.RLock()
KST = timezone(timedelta(hours=9))
QUESTIONS = [
 {'id':'find','title':'맹꽁이를 찾아주세요','hint':'몸통과 다리를 함께 살펴봐요.','models':['maeng','toad','om'],'answer':'maeng','explain':'맹꽁이는 둥근 몸통에 머리가 작고 다리가 짧아요. 색깔 하나보다 여러 특징을 함께 보세요.'},
 {'id':'shape','title':'맹꽁이를 알아보는 단서는?','hint':'방금 관찰한 모습을 떠올려요.','model':'maeng','options':[{'id':'round','text':'둥근 몸통과 짧은 다리'},{'id':'long','text':'길쭉한 몸통과 긴 뒷다리'},{'id':'disc','text':'발끝의 커다란 흡반'}],'answer':'round','explain':'둥근 몸통과 작은 머리, 짧은 다리를 함께 관찰해요. 앞발은 4개, 뒷발은 5개의 발가락이 있고 뒷발에 부분적인 물갈퀴가 있어요.'},
 {'id':'toad','title':'눈 뒤 귀밑샘이 도드라진 친구는?','hint':'눈 뒤쪽을 돌려서 살펴봐요.','models':['maeng','toad','om'],'answer':'toad','explain':'두꺼비는 눈 뒤에 타원형 귀밑샘이 있고 몸에 크고 작은 돌기가 있어요. 옴개구리는 등과 다리의 짧은 융기선을 함께 살펴봐요.'},
 {'id':'crab','title':'위험할 때 자신의 다리를 떼는 게의 행동을 뭐라고 할까요?','hint':'게의 방어 행동에 붙은 이름을 골라보세요.','model':'crab','options':[{'id':'amputation','text':'절단'},{'id':'cutting','text':'절삭'},{'id':'autotomy','text':'자절'}],'answer':'autotomy','explain':'정답은 자절이에요. 일부 게는 위험할 때 스스로 다리를 떼어내고 피하기도 해요. 다시 자라는 데에는 탈피와 시간이 필요하니 실제 게의 다리를 잡아당기지 않아요.'}
]

def today(): return datetime.now(KST).date().isoformat()
@contextlib.contextmanager
def connect():
    db=sqlite3.connect(os.environ.get('SONGDO_DB',str(ROOT/'data/records.sqlite3')))
    db.row_factory=sqlite3.Row
    try:
        with db:yield db
    finally:db.close()
def init():
    Path(os.environ.get('SONGDO_DB',str(ROOT/'data/records.sqlite3'))).parent.mkdir(parents=True,exist_ok=True)
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, created REAL, payload TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS records (token TEXT PRIMARY KEY, day TEXT, nickname TEXT, score INTEGER, duration INTEGER, created REAL)')
        db.execute('CREATE INDEX IF NOT EXISTS records_day ON records(day,score,duration)')
        db.execute('DELETE FROM sessions WHERE created < ?', (time.time()-86400,))
        db.execute('DELETE FROM records WHERE created < ?', (time.time()-86400*30,))

class Invalid(Exception):
    def __init__(self,message,status=400): self.message=message;self.status=status

class Handler(SimpleHTTPRequestHandler):
    server_version='Songdo/1'
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(APP),**kw)
    def log_message(self,*args):pass  # No camera data, IP or access-log persistence.
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy','camera=(self), microphone=(), geolocation=()')
        self.send_header('Cache-Control','no-store' if self.path.startswith('/api/') else 'no-cache')
        super().end_headers()
    def translate_path(self,path):
        clean=unquote(urlsplit(path).path)
        # Allow exactly one shared model outside app; never serve source/db directories.
        if clean=='/assets/crab.glb':return str(ROOT/'assets/crab/sangsang-art-longleg-crab.glb')
        return super().translate_path(path)
    def list_directory(self,path):self.send_error(404);return None
    def json(self,value,status=200,cookie=None):
        b=json.dumps(value,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(b)))
        if cookie:self.send_header('Set-Cookie',f'songdo_session={cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400')
        self.end_headers();self.wfile.write(b)
    def token(self):
        cookie=SimpleCookie()
        try:cookie.load(self.headers.get('Cookie',''))
        except Exception:raise Invalid('체험을 다시 시작해 주세요.',401)
        return cookie['songdo_session'].value if 'songdo_session' in cookie else ''
    def load(self,db):
        row=db.execute('SELECT payload,created FROM sessions WHERE token=?',(self.token(),)).fetchone()
        if not row or time.time()-row['created']>86400:raise Invalid('체험을 다시 시작해 주세요.',401)
        return json.loads(row['payload'])
    def save(self,db,s):db.execute('UPDATE sessions SET payload=? WHERE token=?',(json.dumps(s),self.token()))
    def question(self,s):
        if s['index']>=len(QUESTIONS):return {'complete':True,'score':s['score'],'duration':s['duration']}
        q=QUESTIONS[s['index']];opts=s['orders'][s['index']]
        return {k:q[k] for k in ['id','title','hint','model','sound'] if k in q}|{'index':s['index'],'options':opts,'visual':bool(q.get('models')),'state':s['state'],'complete':False}
    def result(self,s):return {'complete':s['index']==len(QUESTIONS),'score':s['score'],'duration':s['duration'],'history':s['history']}
    def do_GET(self):
        path=urlsplit(self.path).path
        if not path.startswith('/api/'):
            if any(x.startswith('.') for x in unquote(path).split('/')):self.send_error(404);return
            return super().do_GET()
        try:
            with LOCK,connect() as db:
                if path=='/api/rankings':
                    rows=db.execute('SELECT nickname,score,duration FROM records WHERE day=? ORDER BY score DESC,duration,created LIMIT 10',(today(),)).fetchall()
                    return self.json({'day':today(),'rows':[dict(r) for r in rows],'scope':'shared','retentionDays':30})
                if path=='/api/question':return self.json(self.question(self.load(db)))
                if path=='/api/result':return self.json(self.result(self.load(db))|{'recordSaved':bool(db.execute('SELECT 1 FROM records WHERE token=?',(self.token(),)).fetchone())})
                raise Invalid('찾을 수 없는 요청입니다.',404)
        except Invalid as e:self.json({'error':e.message},e.status)
    def do_POST(self):
        try:
            origin=self.headers.get('Origin')
            if origin and urlsplit(origin).netloc!=self.headers.get('Host'):raise Invalid('다른 사이트의 요청은 허용하지 않습니다.',403)
            if self.headers.get('Sec-Fetch-Site')=='cross-site':raise Invalid('허용하지 않는 요청입니다.',403)
            if self.headers.get_content_type()!='application/json':raise Invalid('JSON 요청이 필요합니다.',415)
            length=int(self.headers.get('Content-Length','0'))
            if length<0 or length>4096:raise Invalid('요청이 너무 큽니다.',413)
            data=json.loads(self.rfile.read(length) or '{}')
            if not isinstance(data,dict):raise Invalid('요청 형식을 확인해 주세요.')
            path=urlsplit(self.path).path
            with LOCK,connect() as db:
                if path=='/api/session':
                    now=time.time();recent=self.server.starts.setdefault(self.client_address[0],[])
                    recent[:]=[t for t in recent if now-t<60]
                    if len(recent)>=12:raise Invalid('잠시 후 다시 시작해 주세요.',429)
                    recent.append(now)
                    # Bounded transient rate-limit map; no IP goes to SQLite.
                    if len(self.server.starts)>2000:self.server.starts={self.client_address[0]:recent}
                    orders=[]
                    for q in QUESTIONS:
                        opts=[{'id':k,'model':k} for k in q['models']] if q.get('models') else [dict(o) for o in q['options']]
                        secrets.SystemRandom().shuffle(opts);orders.append(opts)
                    s={'index':0,'score':0,'duration':0,'state':'waiting','started':None,'elapsed':0,'orders':orders,'history':[]}
                    token=secrets.token_urlsafe(32)
                    db.execute('DELETE FROM sessions WHERE created < ?',(now-86400,))
                    db.execute('DELETE FROM records WHERE created < ?',(now-86400*30,))
                    db.execute('INSERT INTO sessions VALUES(?,?,?)',(token,now,json.dumps(s)))
                    return self.json({'ok':True},cookie=token)
                s=self.load(db)
                if path=='/api/rankings':
                    if s['index']!=len(QUESTIONS):raise Invalid('네 문제를 완료한 뒤 기록할 수 있어요.',409)
                    nick=data.get('nickname','')
                    if not isinstance(nick,str) or not re.fullmatch(r'[가-힣A-Za-z0-9 ]{2,12}',nick):raise Invalid('별명은 한글·영문·숫자 2~12자로 적어주세요.')
                    if data.get('consent') is not True:raise Invalid('별명과 기록 공개에 동의해 주세요.')
                    if db.execute('SELECT 1 FROM records WHERE token=?',(self.token(),)).fetchone():raise Invalid('이미 저장한 기록이에요.',409)
                    db.execute('INSERT INTO records VALUES(?,?,?,?,?,?)',(self.token(),today(),nick,s['score'],s['duration'],time.time()))
                    return self.json({'ok':True})
                if path=='/api/delete-record':
                    db.execute('DELETE FROM records WHERE token=?',(self.token(),));return self.json({'ok':True})
                if s['index']>=len(QUESTIONS):raise Invalid('이미 완료한 체험입니다.',409)
                if data.get('index')!=s['index']:raise Invalid('문제 순서가 바뀌었어요. 다시 불러와 주세요.',409)
                if path=='/api/ready':
                    if s['state']!='waiting':raise Invalid('이미 시작한 문제입니다.',409)
                    s['state']='active';s['started']=time.time()
                elif path=='/api/pause':
                    if s['state']=='active':s['elapsed']+=max(0,time.time()-s['started']);s['started']=None;s['state']='paused'
                elif path=='/api/resume':
                    if s['state']!='paused':raise Invalid('일시정지 상태가 아닙니다.',409)
                    s['state']='active';s['started']=time.time()
                elif path=='/api/answer':
                    if s['state']!='active':raise Invalid('문제를 시작한 후 골라주세요.',409)
                    q=QUESTIONS[s['index']];answer=data.get('answer')
                    if answer not in [o['id'] for o in s['orders'][s['index']]]:raise Invalid('보기 중에서 골라주세요.')
                    elapsed=round((s['elapsed']+max(0,time.time()-s['started']))*1000)
                    correct=answer==q['answer'];s['score']+=int(correct);s['duration']+=elapsed
                    feedback={'correct':correct,'answer':q['answer'],'explain':q['explain'],'elapsed':elapsed,'id':q['id']}
                    s['history'].append(feedback);s['index']+=1;s['state']='waiting';s['elapsed']=0;s['started']=None
                    self.save(db,s);return self.json(feedback|{'score':s['score'],'complete':s['index']==len(QUESTIONS)})
                else:raise Invalid('찾을 수 없는 요청입니다.',404)
                self.save(db,s);self.json({'ok':True})
        except Invalid as e:self.json({'error':e.message},e.status)
        except (ValueError,TypeError,KeyError):self.json({'error':'요청 형식을 확인해 주세요.'},400)
        except Exception:self.json({'error':'저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'},500)

def make_server(host='127.0.0.1',port=8767):
    init();mimetypes.add_type('text/javascript','.mjs');mimetypes.add_type('application/wasm','.wasm');mimetypes.add_type('model/gltf-binary','.glb')
    s=ThreadingHTTPServer((host,port),Handler);s.starts={};return s
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8767);args=parser.parse_args()
    server=make_server(args.host,args.port)
    print(f'Songdo AR: http://{args.host}:{server.server_port}',flush=True)
    with contextlib.suppress(KeyboardInterrupt):server.serve_forever()
