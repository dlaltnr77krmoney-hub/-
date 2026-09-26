import importlib.util,json,os,threading,tempfile,unittest,urllib.request,urllib.error,http.cookiejar,time
from pathlib import Path
spec=importlib.util.spec_from_file_location('songdo_server',Path(__file__).resolve().parents[1]/'server/server.py')
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class Flow(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();os.environ['SONGDO_DB']=str(Path(cls.tmp.name)/'test.sqlite3');cls.server=s.make_server(port=0);cls.url=f'http://127.0.0.1:{cls.server.server_port}';cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def setUp(self):self.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def request(self,path,data=None,origin=None):
  headers={'Content-Type':'application/json'}
  if origin:headers['Origin']=origin
  r=urllib.request.Request(self.url+'/api/'+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
  try:
   with self.client.open(r) as response:return response.status,json.load(response)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_scoring_timing_replay_and_shared_ranking(self):
  self.assertEqual(self.request('session',{})[0],200)
  self.assertEqual(self.request('rankings',{'nickname':'테스트','consent':True})[0],409)
  for index,q in enumerate(s.QUESTIONS):
   code,public=self.request('question');self.assertEqual(code,200);self.assertNotIn('answer',public);self.assertNotIn('explain',public)
   if index==len(s.QUESTIONS)-1:
    self.assertEqual(public['id'],'crab');self.assertFalse(public['visual'])
    self.assertEqual({o['id'] for o in public['options']},{'amputation','cutting','autotomy'})
   self.assertEqual(self.request('answer',{'index':index,'answer':q['answer']})[0],409)
   time.sleep(.035) # Waiting for 3D must not count.
   self.assertEqual(self.request('ready',{'index':index})[0],200)
   self.assertEqual(self.request('ready',{'index':index})[0],409)
   self.assertEqual(self.request('pause',{'index':index})[0],200)
   time.sleep(.08) # Hidden page time must not count.
   self.assertEqual(self.request('resume',{'index':index})[0],200)
   code,result=self.request('answer',{'index':index,'answer':q['answer']});self.assertEqual(code,200);self.assertTrue(result['correct']);self.assertLess(result['elapsed'],75)
   self.assertEqual(self.request('answer',{'index':index,'answer':q['answer']})[0],409)
  self.assertEqual(self.request('result')[1]['score'],len(s.QUESTIONS))
  self.assertEqual(self.request('rankings',{'nickname':'관찰친구','consent':False})[0],400)
  self.assertEqual(self.request('rankings',{'nickname':'<script>','consent':True})[0],400)
  self.assertEqual(self.request('rankings',{'nickname':'관찰친구','consent':True})[0],200)
  self.assertTrue(self.request('result')[1]['recordSaved'])
  self.assertEqual(self.request('rankings',{'nickname':'관찰친구','consent':True})[0],409)
  other=urllib.request.urlopen(self.url+'/api/rankings');self.assertEqual(json.load(other)['rows'][0]['score'],len(s.QUESTIONS))
  self.assertEqual(self.request('delete-record',{})[0],200);self.assertEqual(self.request('rankings')[1]['rows'],[])
  self.assertFalse(self.request('result')[1]['recordSaved'])
 def test_wrong_answers_validation_origin_and_private_paths(self):
  self.request('session',{})
  self.assertEqual(self.request('ready',{'index':len(s.QUESTIONS)-1})[0],409)
  self.assertEqual(self.request('ready',{'index':0},origin='https://example.com')[0],403)
  self.request('ready',{'index':0})
  self.assertEqual(self.request('answer',{'index':0,'answer':'invalid'})[0],400)
  result=self.request('answer',{'index':0,'answer':'toad'})[1];self.assertFalse(result['correct']);self.assertEqual(result['score'],0)
  for path in ['/data/records.sqlite3','/server/server.py','/.git/config','/../server/server.py']:
   with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(self.url+path)
   self.assertEqual(e.exception.code,404)
  with s.connect() as db:self.assertGreater(db.execute('SELECT count(*) FROM sessions').fetchone()[0],0)
if __name__=='__main__':unittest.main(verbosity=2)
