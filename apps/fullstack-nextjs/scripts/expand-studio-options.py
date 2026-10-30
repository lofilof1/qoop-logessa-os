import json,re,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1];d=json.loads((root/'data/knowledge/dataset.json').read_text());terms=[x['term'].lower() for x in d['keywords']]
colors={'blue':'Mavi','green':'Yeşil','black':'Siyah','pink':'Pembe','white':'Beyaz','gold':'Altın','navy':'Lacivert','sage':'Adaçayı','red':'Kırmızı','neutral':'Nötr','beige':'Bej','brown':'Kahverengi','teal':'Petrol yeşili','cream':'Krem','purple':'Mor','gr[ae]y':'Gri','orange':'Turuncu','yellow':'Sarı','terracotta':'Terrakota','burgundy':'Bordo','olive':'Zeytin yeşili','ivory':'Fildişi','ochre':'Oker','dusty pink':'Pudra pembe','emerald':'Zümrüt yeşili','pastel':'Pastel','monochrome':'Monokrom'}
motifs={'botanical':'Botanik dallar','floral|flowers?':'Çiçekler','abstract':'Soyut biçimler','geometric':'Geometrik biçimler','forest':'Orman ağaçları','birds?':'Kuşlar','trees?':'Ağaçlar','landscape':'Manzara öğeleri','tropical':'Tropikal bitkiler','animals?':'Hayvanlar','dinosaur':'Dinozor','garden':'Bahçe bitkileri','mountains?':'Dağlar','woodland':'Orman canlıları','ocean':'Okyanus','palms?':'Palmiye','lea[fv](?:es)?':'Yapraklar','cranes?':'Turna','heron':'Balıkçıl','ducks?':'Ördek','swans?':'Kuğu','butterfl(?:y|ies)':'Kelebek','peacock':'Tavus kuşu','cherry blossom':'Kiraz çiçekleri','magnolia':'Manolya','peon(?:y|ies)':'Şakayık','roses?':'Gül','wildflower':'Kır çiçekleri','fern':'Eğrelti otu','eucalyptus':'Okaliptüs','pine':'Çam','bamboo':'Bambu','mushroom':'Mantar','clouds?':'Bulut','waves?':'Dalga','stars?':'Yıldız','moon':'Ay','sun':'Güneş','lemon':'Limon','orange fruit':'Portakal meyvesi','olive':'Zeytin dalları','vines?':'Sarmaşık','fish':'Balık','coral':'Mercan','shells?':'Deniz kabuğu','deer':'Geyik','rabbits?':'Tavşan','fox':'Tilki','horses?':'At','tigers?':'Kaplan','elephants?':'Fil','lakes?':'Göl','river':'Nehir','hills?':'Tepeler','stripes?|striped':'Çizgiler','dots?|polka':'Noktalar','arches?':'Kemerler','damask':'Damask bezeme'}
styles={'chinoiserie':'Chinoiserie','toile':'Toile de Jouy','art deco|deco':'Art Deco','victorian':'Viktoryen','gothic':'Gotik','coastal':'Kıyı estetiği','vintage':'Vintage','modern':'Modern','traditional':'Geleneksel','whimsical':'Masalsı','retro':'Retro','cottagecore':'Cottagecore','japanese':'Japon esintili','rustic':'Rustik','farmhouse':'Kır evi','scandinavian':'İskandinav','minimalist':'Minimalist','maximalist':'Maksimalist','bohemian|boho':'Bohem','mid century':'Mid-century','art nouveau':'Art Nouveau','oriental':'Doğu esintili','french':'Fransız esintili','moody':'Atmosferik / moody'}
def evidence(mapping):
 result=[]
 for phrase,label in mapping.items():
  pat=re.compile(r'\b(?:'+phrase+r')\b');count=sum(bool(pat.search(t)) for t in terms)
  if count>=3:result.append({'value':label,'phrase':phrase,'keywordCount':count})
 return sorted(result,key=lambda x:(-x['keywordCount'],x['value']))
M=evidence(motifs);K=evidence(colors);S=evidence(styles);fields={}
def add(ids,rows):
 for i in ids:fields[i]=rows
add(['primary','secondary','secondaryExtra'],M)
add(['filler'],[x for x in M if x['value'] in ['Yapraklar','Kelebek','Bulut','Yıldız','Ay','Güneş','Kır çiçekleri','Deniz kabuğu','Noktalar','Sarmaşık','Zeytin dalları','Kuşlar','Çiçekler']])
add(['colorRole_'+x for x in ['background','primary','secondary','accent','shadow']],K)
add(['styleFamily'],S)
add(['medium'],evidence({'watercolor':'Suluboya','gouache':'Guaj','ink':'Mürekkep','hand drawn':'Elle çizilmiş','hand painted':'Elle boyanmış','oil painting':'Yağlı boya görünümü','engraving|etching':'Gravür','illustration':'İllüstrasyon','line art':'Çizgi sanatı'}))
add(['scene'],evidence({k:v for k,v in motifs.items() if v in ['Okyanus','Dağlar','Manzara öğeleri','Orman ağaçları','Bahçe bitkileri','Tropikal bitkiler','Orman canlıları','Göl','Nehir','Tepeler']}))
add(['linework'],evidence({'line art':'Çizgi sanatı','sketch':'Eskiz çizgisi','outline':'Kontur çizgisi','silhouette':'Siluet'}))
add(['composition'],evidence({'panoramic':'Panoramik sahne','scenic':'Sahnesel kompozisyon','all over':'Yüzeye yayılan kompozisyon','striped|stripes':'Şerit düzeni','layered':'Katmanlı düzen'}))
add(['surface'],evidence({'smooth':'Pürüzsüz yüzey','matte':'Mat görünüm','gradient':'Ton geçişli yüzey'}))
add(['saturation'],evidence({'pastel':'Pastel','muted':'Kırılmış / muted','vibrant':'Parlak / vibrant','desaturated':'Doygunluğu azaltılmış'}))
add(['detail'],evidence({'minimalist':'Sadeleştirilmiş detay','intricate':'İnce işlenmiş detay','bold':'İri ve belirgin biçimler'}))
pairs=[]
for i,a in enumerate(K):
 for b in K[i+1:]:
  pa=re.compile(r'\b(?:'+a['phrase']+r')\b');pb=re.compile(r'\b(?:'+b['phrase']+r')\b');n=sum(bool(pa.search(t) and pb.search(t)) for t in terms)
  if n>=3:pairs.append({'value':a['value']+' / '+b['value'],'phrase':a['phrase']+' + '+b['phrase'],'keywordCount':n})
fields['palette']=sorted(pairs,key=lambda x:-x['keywordCount'])[:35]
cpath=root/'data/lessons/catalog.json';c=json.loads(cpath.read_text())
if not any(f['id']=='styleFamily' for f in c['fields']):
 f=dict(next(f for f in c['fields'] if f['id']=='medium'));f.update(id='styleFamily',label='Tasarım tarzı',options=['Henüz belirlenmedi'],optional=True,origin='application',note='Araştırma kelimelerinden derlenen stil seçenekleri; sıklık satış veya Qoop marka onayı değildir.');c['fields'].append(f);cpath.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
out={'version':'market-options-v1','snapshotDate':d['manifest']['snapshotDate'],'sourceHash':hashlib.sha256((root/'data/knowledge/dataset.json').read_bytes()).hexdigest(),'countDefinition':'İfadenin geçtiği tekil anahtar kelime satırı sayısı; arama hacmi veya satış değildir.','fields':fields}
(root/'data/lessons/market-options.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Fields enriched',len(fields),'option associations',sum(len(x) for x in fields.values()),'motifs',len(M),'colors',len(K),'styles',len(S),'palettes',len(fields['palette']))
