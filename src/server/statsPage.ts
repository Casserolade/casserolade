function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * La page secrète des statistiques (gameServer.ts, /stats/<jeton>) : une coquille que les scripts du tableau
 * de bord remplissent en temps réel, depuis le flux SSE de `base`/flux : stats/tableau.js pour le direct,
 * stats/frequentation.js pour les jours, les visiteurs et les parties.
 */
export function statsPage(base: string): string {
  const safeBase = escapeHtml(base);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Casserolade · en direct</title>
<style>
:root { --fond: #0b0e18; --carte: #141a2a; --bord: #232b42; --texte: #e8eaf0; --pale: #8f98ad; --or: #ffd84a; --bleu: #4d8dff; --orange: #ffaa2e; --vert: #4cd07a; --rouge: #ff5d50; }
* { box-sizing: border-box; }
body { margin: 0; padding: 18px; background: var(--fond); color: var(--texte); font: 14px/1.4 system-ui, sans-serif; }
header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 18px; margin-bottom: 14px; }
h1 { margin: 0; font-size: 20px; } h2 { margin: 22px 0 10px; font-size: 15px; color: var(--or); letter-spacing: .02em; }
.meta { color: var(--pale); font-size: 13px; }
.etat::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--rouge); vertical-align: 1px; }
.etat.vivant::before { background: var(--vert); box-shadow: 0 0 8px var(--vert); }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.tile { padding: 10px 12px; border-radius: 10px; background: var(--carte); border: 1px solid var(--bord); }
.tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; } .tile span { color: var(--pale); font-size: 12px; }
.tile.alerte b { color: var(--rouge); }
.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
figure { margin: 0; padding: 10px 12px; border-radius: 10px; background: var(--carte); border: 1px solid var(--bord); }
figcaption { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--pale); font-size: 12px; margin-bottom: 6px; }
figcaption i { display: inline-block; width: 10px; height: 3px; margin-right: 4px; vertical-align: 3px; border-radius: 2px; }
svg { display: block; width: 100%; height: 90px; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 14px; } @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
ol { margin: 0; padding: 0; list-style: none; max-height: 340px; overflow-y: auto; }
li { padding: 5px 0; border-bottom: 1px solid var(--bord); } li time { color: var(--pale); font-variant-numeric: tabular-nums; margin-right: 8px; }
li.incident { color: var(--rouge); } li.partie b { color: var(--orange); }
table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { padding: 5px 6px; border-bottom: 1px solid var(--bord); text-align: right; }
th:first-child, td:first-child { text-align: left; } th { color: var(--pale); font-weight: 600; }
td.bar { width: 16%; } td.bar i { display: block; height: 8px; border-radius: 4px; background: var(--bleu); }
.alerte { color: var(--rouge); font-weight: 700; } .scroll { overflow-x: auto; }
h3 { margin: 14px 0 6px; font-size: 13px; color: var(--pale); } tr.pale td { color: var(--pale); }
.duo { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
li.visite span { color: var(--bleu); } li.local span { color: var(--vert); } li.reprise span { color: var(--orange); }
#parties th:last-child, td.sieges { text-align: left; } #parties td:not(.sieges), #parties th:not(:last-child) { width: 1%; white-space: nowrap; padding-right: 14px; } .siege { display: inline-block; margin: 2px 4px 2px 0; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--bord); font-size: 12px; white-space: nowrap; }
.siege.humain { border-color: var(--orange); color: var(--orange); } .siege.deco { border-style: dashed; } .siege.mort { opacity: .45; text-decoration: line-through; } .siege.repris::after { content: ' · bot'; }
.heures { display: flex; justify-content: space-between; color: var(--pale); font-size: 11px; font-variant-numeric: tabular-nums; }
button { margin-left: 6px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--bord); background: var(--carte); color: var(--texte); font: inherit; cursor: pointer; } button:hover { border-color: var(--or); }
</style></head><body data-base="${safeBase}">
<header><h1>Casserolade · en direct</h1><span id="etat" class="etat meta">connexion…</span><span id="version" class="meta"></span><span id="depuis" class="meta"></span></header>
<h2>Maintenant</h2>
<div id="direct" class="tiles"></div>
<h2>Les parties en ligne en cours</h2>
<div id="parties" class="scroll"><p class="meta">…</p></div>
<h2>Les cinq dernières minutes, seconde par seconde</h2>
<div id="courbes" class="charts"></div>
<div class="cols">
  <section><h2>Le fil</h2><ol id="fil"></ol></section>
  <section><h2>Aujourd'hui</h2><div id="jour" class="tiles"></div><h2>Heure par heure</h2><figure id="heures"></figure><h2>Derniers incidents</h2><div id="incidents" class="meta">Aucun incident.</div></section>
</div>
<h2>La fréquentation</h2>
<div class="scroll"><table id="totaux"></table></div>
<div class="duo">
  <section><h2>D'où ils viennent, sur trente jours</h2><table id="sources"></table></section>
  <section><h2>Sur quel écran, sur trente jours</h2><table id="appareils"></table></section>
</div>
<h2>Les trente derniers jours</h2>
<div class="scroll"><table id="jours"></table></div>
<p id="ancienne" class="meta" hidden></p>
<div class="duo">
  <section><h2>Les parties solo, par héros</h2><div id="heros"></div></section>
  <section><h2>Les parties solo, par niveau des bots</h2><table id="niveaux"></table><h2>La carrière, élection par élection</h2><table id="chapitres"></table></section>
</div>
<h2>Les parties en ligne allées au bout</h2>
<div id="enligne"></div>
<p class="meta">Chaque page du site compte elle-même sa visite : un visiteur par navigateur et par jour, sans cookie ni identifiant, et aucune adresse n'est gardée. Les robots sont comptés à part. Les parties solo, de carrière et du tutoriel tournent dans la page : elle dit au serveur quand elles commencent et comment elles finissent. Les parties en ligne allées au bout sont gardées sur le serveur pour l'équilibrage, sans pseudo ni adresse.</p>
<p id="exclusion" class="meta"></p>
<script src="${safeBase}/frequentation.js"></script>
<script src="${safeBase}/tableau.js"></script>
</body></html>`;
}
