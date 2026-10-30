from pathlib import Path
import csv,json,hashlib,collections,re,shutil,datetime
import os
src=Path(os.environ.get('QOOP_LEGACY_ROOT','/Users/USER/Desktop/Logessa'));app=Path(__file__).resolve().parent.parent;out=app/'data/knowledge';out.mkdir(parents=True,exist_ok=True)
def read(rel):
 with (src/rel).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
settings=json.loads((src/'stil-arsivi/qoop-ayarlar.json').read_text());snapshot=settings['tarih']
families=[{'id':code,'name':name,'deferred':name in settings.get('ertelenen',[])} for code,name in settings['aileler'].items()]
print('family mapping sample',families[:2])
# Map family dictionary may be name -> code.
if families and len(families[0]['id'])>5:families=[{'id':name,'name':code,'deferred':code in settings.get('ertelenen',[])} for code,name in settings['aileler'].items()]
byname={x['name']:x['id'] for x in families}
def family(name):
 if name not in byname:
  code='EXT-'+hashlib.sha256(name.encode()).hexdigest()[:8];families.append({'id':code,'name':name,'deferred':False});byname[name]=code
 return byname[name]
def listing(r):
 v=r.get('listing_id','').strip();m=re.search(r'/listing/(\d+)',r.get('link',''));return v or (m[1] if m else '')
def identity(r,prefix):return 'listing:'+listing(r) if listing(r) else prefix+':'+r.get('ar_no',hashlib.sha256(json.dumps(r,sort_keys=True).encode()).hexdigest()[:16])
refs={};excluded=[];counts=collections.Counter();image_dir=app/'public/research';image_dir.mkdir(parents=True,exist_ok=True)
for r in read('stil-arsivi/arsiv.csv'):
 if r.get('qoop_haric') or r.get('urun_tipi')!='duvar kağıdı':excluded.append({'source':'arsiv','id':r['ar_no'],'reason':r.get('qoop_haric') or 'wallpaper olmayan ürün'});continue
 key=identity(r,'archive');rawp=src/'kaynak/veritabani/items'/f"{r['kayit_id']}.json";raw=json.loads(rawp.read_text()) if rawp.exists() else {}
 img=src/'stil-arsivi'/r['gorsel'];target=image_dir/(r['ar_no']+img.suffix)
 if img.is_file() and (not target.exists() or digest(target)!=digest(img)):shutil.copyfile(img,target)
 analysis=raw.get('analysis',{})
 value={'id':key,'familyId':family(r['aile']),'title':r.get('urun_basligi') or r.get('ozet') or r['ar_no'],'purpose':r['amac'],'shop':r.get('magaza',''),'listingId':listing(r) or None,'url':r.get('link') or None,'imagePath':'/research/'+target.name if target.exists() else None,'observedAt':r.get('eklenme') or snapshot,'data':{'aliases':[r['ar_no']],'summary':r.get('ozet'),'palette':r.get('palet_hex'),'style':r.get('stil_etiketleri'),'technique':r.get('teknik_etiketi'),'analysis':analysis,'market':{k:r.get(k) for k in ['fiyat','tahmini_satis','satis_100gun','ilan_yasi_gun','favori','goruntulenme','erank_kelime','siralama_durumu']},'marketIsEstimate':True,'sourcePaths':['stil-arsivi/arsiv.csv',str(rawp.relative_to(src))]}}
 if key in refs:
  refs[key]['data']['aliases'].append(r['ar_no']);refs[key]['data'].setdefault('additionalEvidence',[]).append({'familyId':value['familyId'],'title':value['title'],'imagePath':value['imagePath'],'data':value['data']});counts['merged_archive']+=1
 else:refs[key]=value
for r in read('stil-arsivi/adaylar.csv'):
 key=identity(r,'candidate');familyId=family(r['aile'])
 if key in refs:refs[key]['data']['candidateEvidence']={k:r.get(k) for k in ['kaynak','rol','tarih','erank_kelime']};refs[key]['data']['sourcePaths'].append('stil-arsivi/adaylar.csv');counts['candidate_overlap']+=1;continue
 refs[key]={'id':key,'familyId':familyId,'title':r['baslik'],'purpose':'pazar','shop':r['magaza'],'listingId':listing(r) or None,'url':r.get('link') or None,'imagePath':None,'observedAt':r['tarih'],'data':{'aliases':[],'market':{k:r.get(k) for k in ['tahmini_satis','satis_100gun','ilan_yasi_gun','favori','siralama_durumu','fiyat_usd']},'marketIsEstimate':True,'sourcePaths':['stil-arsivi/adaylar.csv'],'role':r['rol']}}
keywords=[]
for r in read('stil-arsivi/kelimeler.csv'):
 if r['sinif']=='alakasız / dijital':counts['irrelevant_keywords']+=1;continue
 keywords.append({'term':r['kelime'],'category':r['sinif'],'focused':bool(re.search(r'wall\s*paper|mural',r['kelime'],re.I)),'data':r})
prompts=[]
flags={p['kod']:p for p in settings['promptlar']}
for p in sorted((src/'kaynak/veritabani/promptlar').glob('*.json')):
 d=json.loads(p.read_text());flag=flags.get(d['kod'],{});prompts.append({'code':d['kod'],'title':d['baslik'],'familyId':family(d['aile']),'prompt':d['prompt'],'used':bool(d.get('used') or flag.get('kullanildi')),'sourceId':p.stem,'data':{k:v for k,v in d.items() if k not in ['prompt','baslik','aile','kod']},'legacyFlags':flag})
docs=[]
for p in [src/'stil-arsivi/kurallar.md',src/'stil-arsivi/receteler.md',src/'stil-arsivi/aile-ozeti.md',*sorted((src/'stil-arsivi/aileler').glob('*.md'))]:
 docs.append({'id':str(p.relative_to(src)),'title':p.stem,'body':p.read_text(),'sourceDate':snapshot,'kind':'legacy_rules' if p.name=='kurallar.md' else 'reference','sha256':digest(p)})
# Preserve dated evidence separately. No historical ratios promoted to current facts.
evidence={'measurements':read('stil-arsivi/olcumler.csv'),'tracking':read('stil-arsivi/takip.csv'),'legacyAnalysis':read('proje/etsy-stil-arsivi.csv')}
for k,v in evidence.items():docs.append({'id':'evidence/'+k,'title':k,'body':json.dumps(v,ensure_ascii=False),'kind':'historical_evidence','sourceDate':snapshot,'sha256':hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()})
inventory=[{'hash':digest(p)} for root in [src,src.parent/'erank'] if root.exists() for p in root.rglob('*.csv')];manifest={'source':'Qoop Etsy v32 local snapshot','snapshotDate':snapshot,'sourceRoot':str(src),'csvFilesScanned':len(inventory),'uniqueByteContents':len(set(x['hash'] for x in inventory)),'counts':{'families':len(families),'references':len(refs),'keywords':len(keywords),'focusedKeywords':sum(x['focused'] for x in keywords),'prompts':len(prompts),'documents':len(docs),'excludedReferences':len(excluded),**counts},'sources':[{'path':str(p.relative_to(src)),'sha256':digest(p)} for p in [src/'stil-arsivi/arsiv.csv',src/'stil-arsivi/adaylar.csv',src/'stil-arsivi/kelimeler.csv',src/'stil-arsivi/qoop-ayarlar.json']],'exclusions':excluded,'policyVersion':'qoop-curation-v1'}
payload={'families':families,'references':list(refs.values()),'keywords':keywords,'prompts':prompts,'documents':docs,'manifest':manifest}
content=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':'));manifest['datasetHash']=hashlib.sha256(content.encode()).hexdigest();(out/'dataset.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')));(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps(manifest['counts'],ensure_ascii=False))
