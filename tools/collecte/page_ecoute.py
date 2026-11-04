"""Fabrique une page locale pour écouter et trier les extraits. Usage : python3 -I page_ecoute.py audio.json sortie.html [cle_stockage]"""
import html, json, os, sys

data = json.load(open(sys.argv[1], encoding="utf8"))
store_key = sys.argv[3] if len(sys.argv) > 3 else "ecoute"
root = os.path.dirname(os.path.abspath(sys.argv[2]))
rows = []
for r in data:
    items = []
    for e in r["extraits"]:
        rel = os.path.relpath(os.path.abspath(e["fichier"]), root)
        key = html.escape(r["id"] + "/" + e["video"])
        flag = "" if e.get("chaine_connue") else " <small>(chaîne inconnue)</small>"
        kind = " <strong>vidéo entière</strong>" if e.get("entier") else ""
        items.append(f"""<li><audio controls preload="none" src="{html.escape(rel)}"></audio>
<a href="{html.escape(e['url'])}" target="_blank" rel="noreferrer">{html.escape(e['titre'])}</a> — {html.escape(e['chaine'] or '?')}{flag}{kind}
<br><small>Sous-titres : « {html.escape(e.get('texte', ''))} »</small>
<fieldset data-key="{key}"><legend>Verdict</legend>
<label><input type="radio" name="{key}" value="bon"> La vraie voix, la bonne phrase</label>
<label><input type="radio" name="{key}" value="autre"> Quelqu'un d'autre</label>
<label><input type="radio" name="{key}" value="rate"> Phrase coupée ou absente</label>
</fieldset></li>""")
    links = ""
    if not r["extraits"]:
        c = r["candidats"][:4]
        links = "<p>Aucun extrait. Pistes : " + (", ".join(f'<a href="{html.escape(x["url"])}" target="_blank" rel="noreferrer">{html.escape(x["titre"][:60])}</a>' for x in c) or "aucune") + "</p>"
    rows.append(f"<section><h2>{html.escape(r['qui'])} : « {html.escape(r['phrase'])} »</h2>{links}<ul>{''.join(items)}</ul></section>")

page = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Écoute des citations</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>
body{font:16px/1.45 system-ui,sans-serif;max-width:60rem;margin:auto;padding:1rem;background:#fafafa;color:#111}
section{background:#fff;border:1px solid #ddd;border-radius:8px;padding:.5rem 1rem;margin:1rem 0}
h2{font-size:1.05rem}ul{list-style:none;padding:0}li{margin:1rem 0}audio{display:block;width:100%}
fieldset{border:0;padding:.25rem 0}legend{position:absolute;left:-999px}label{margin-right:1rem;white-space:nowrap}
#bar{position:sticky;top:0;background:#111;color:#fff;padding:.5rem 1rem;border-radius:8px;display:flex;gap:1rem;align-items:center}
button{font:inherit;padding:.25rem .75rem}
@media (prefers-color-scheme:dark){body{background:#111;color:#eee}section{background:#1c1c1c;border-color:#333}a{color:#8cf}}
</style></head><body><h1>Écoute des citations</h1>
<div id="bar"><span id="count"></span><button id="save" type="button">Télécharger mes verdicts</button></div>
""" + "".join(rows) + """
<script>
const KEY='__KEY__-verdicts';
let verdicts={};
try{verdicts=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
const total=document.querySelectorAll('fieldset').length;
const refresh=()=>{document.getElementById('count').textContent=Object.keys(verdicts).length+' / '+total+' écoutés'};
document.querySelectorAll('fieldset').forEach(f=>{
  const k=f.dataset.key;
  f.querySelectorAll('input').forEach(i=>{
    if(verdicts[k]===i.value)i.checked=true;
    i.addEventListener('change',()=>{verdicts[k]=i.value;try{localStorage.setItem(KEY,JSON.stringify(verdicts))}catch(e){}refresh()});
  });
});
document.getElementById('save').addEventListener('click',()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(verdicts,null,1)],{type:'application/json'}));
  a.download='__KEY__.json';a.click();
});
refresh();
</script></body></html>"""
open(sys.argv[2], "w", encoding="utf8").write(page.replace("__KEY__", store_key))
print(sum(len(r["extraits"]) for r in data), "extraits sur la page")
