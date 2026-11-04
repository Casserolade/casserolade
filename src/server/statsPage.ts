function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * La page secrète des statistiques (gameServer.ts, /stats/<jeton>) : une coquille que le script du tableau
 * de bord (stats/tableau.js) remplit en temps réel, depuis le flux SSE de `base`/flux.
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
td.bar { width: 16%; } td.bar i { display: block; height: 8px; border-radius: 4px; background: var(--bleu); } td.bar.parties i { background: var(--orange); }
.alerte { color: var(--rouge); font-weight: 700; } .scroll { overflow-x: auto; }
</style></head><body data-base="${safeBase}">
<header><h1>Casserolade · en direct</h1><span id="etat" class="etat meta">connexion…</span><span id="version" class="meta"></span><span id="depuis" class="meta"></span></header>
<h2>Maintenant</h2>
<div id="direct" class="tiles"></div>
<h2>Les cinq dernières minutes, seconde par seconde</h2>
<div id="courbes" class="charts"></div>
<div class="cols">
  <section><h2>Le fil</h2><ol id="fil"></ol></section>
  <section><h2>Aujourd'hui</h2><div id="jour" class="tiles"></div><h2>Derniers incidents</h2><div id="incidents" class="meta">Aucun incident.</div></section>
</div>
<h2>Les trente derniers jours</h2>
<div class="scroll"><table id="jours"></table></div>
<p class="meta">Les parties solo tournent dans la page du joueur : seules leurs visites passent par le serveur. Aucune adresse n'est gardée.</p>
<script src="${safeBase}/tableau.js"></script>
</body></html>`;
}
