// Reads seo-loop/metrics.jsonl and prints a short, Spanish, email-pasteable
// delta between the last two snapshots. Leads with indexation + sitemap state
// (the leading indicators); traffic is shown last and explicitly labeled as
// noise when the swing or the absolute value is too small to mean anything
// (current volume: 8 impressions/28d).
//
// Must never break the pipeline: always exits 0, even on read/parse errors.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const METRICS_PATH = path.join(REPO_ROOT, 'seo-loop', 'metrics.jsonl');

function loadEntries() {
  if (!existsSync(METRICS_PATH)) return [];
  const raw = readFileSync(METRICS_PATH, 'utf8');
  const entries = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines rather than aborting the report
    }
  }
  return entries;
}

function fmtBool(b) {
  // null/undefined = the API call failed, so we never learned the value.
  // Must not render as 'No' — that would report a network failure as a fact.
  if (b === null || b === undefined) return 'sin dato';
  return b ? 'Sí' : 'No';
}

// A change is only real when BOTH snapshots actually measured the value.
function fmtBoolDelta(before, after, label) {
  const unknown = (v) => v === null || v === undefined;
  if (unknown(before) || unknown(after)) {
    return `${label}: ${fmtBool(after)} (sin comparar — falta dato en un snapshot)`;
  }
  return before === after
    ? `${label}: ${fmtBool(after)} (sin cambio)`
    : `${label}: ${fmtBool(before)} -> ${fmtBool(after)} (CAMBIO)`;
}

function fmtPosition(p) {
  return typeof p === 'number' ? p.toFixed(2) : 'N/D';
}

function urlLine(key, entry, prevEntry) {
  const cur = entry?.urls?.[key];
  const curLabel = cur ? (cur.state ?? (cur.error ? `ERROR: ${cur.error}` : 'desconocido')) : 'sin datos';
  if (!prevEntry) return `  ${key}: ${curLabel}`;
  const prev = prevEntry?.urls?.[key];
  const prevLabel = prev ? (prev.state ?? (prev.error ? `ERROR: ${prev.error}` : 'desconocido')) : 'sin datos';
  return prevLabel === curLabel
    ? `  ${key}: ${curLabel} (sin cambio)`
    : `  ${key}: ${prevLabel} -> ${curLabel} (CAMBIO)`;
}

function printBaseline(entry) {
  const lines = [];
  lines.push('=== SEO — snapshot inicial (sin histórico previo para comparar) ===');
  lines.push(`Fecha: ${entry.date}  |  Commit: ${entry.commit ?? 'desconocido'}`);
  lines.push('');
  lines.push('INDEXACIÓN');
  lines.push(`  Indexadas: ${entry.indexed}/${entry.total_urls}`);
  const urlKeys = Object.keys(entry.urls || {});
  for (const key of urlKeys) lines.push(urlLine(key, entry, null));
  lines.push('');
  lines.push('SITEMAP');
  lines.push(`  Descargado por Google: ${fmtBool(entry.sitemap_downloaded)}`);
  lines.push(`  Pendiente de procesar: ${fmtBool(entry.sitemap_pending)}`);
  lines.push(`  Último envío: ${entry.sitemap_last_submitted ?? 'N/D'}`);
  lines.push('');
  lines.push('TRÁFICO (28d) — indicador secundario, muestra insuficiente para sacar conclusiones');
  lines.push(`  Impresiones: ${entry.impressions_28d ?? 'N/D'}`);
  lines.push(`  Clics: ${entry.clicks_28d ?? 'N/D'}`);
  lines.push(`  Posición media: ${fmtPosition(entry.position_28d)}`);
  if (entry.note) {
    lines.push('');
    lines.push(`Nota: ${entry.note}`);
  }
  return lines.join('\n');
}

function printDelta(prev, curr) {
  const lines = [];
  lines.push('=== SEO — delta (snapshot anterior -> actual) ===');
  lines.push(`Fecha: ${prev.date} -> ${curr.date}  |  Commit: ${prev.commit ?? '?'} -> ${curr.commit ?? '?'}`);
  lines.push('');

  lines.push('INDEXACIÓN');
  const indexChanged = prev.indexed !== curr.indexed || prev.total_urls !== curr.total_urls;
  // A failed inspection has no state, so it lands outside `indexed`. If either
  // snapshot had errors, a moved count may just mean "we could not ask Google"
  // — do not announce that as a real change.
  const anyErrored = (prev.errored ?? 0) > 0 || (curr.errored ?? 0) > 0;
  let indexSuffix;
  if (!indexChanged) indexSuffix = ' (sin cambio)';
  else if (anyErrored) indexSuffix = ' (no comparable — hubo inspecciones fallidas)';
  else indexSuffix = ' (CAMBIO)';
  lines.push(
    `  Indexadas: ${prev.indexed}/${prev.total_urls} -> ${curr.indexed}/${curr.total_urls}${indexSuffix}`,
  );
  if ((curr.errored ?? 0) > 0) {
    lines.push(`  ADVERTENCIA: ${curr.errored} inspeccion(es) fallaron en este snapshot — el conteo va corto.`);
  }
  const urlKeys = Array.from(new Set([...Object.keys(prev.urls || {}), ...Object.keys(curr.urls || {})]));
  for (const key of urlKeys) lines.push(urlLine(key, curr, prev));
  lines.push('');

  lines.push('SITEMAP');
  lines.push(`  ${fmtBoolDelta(prev.sitemap_downloaded, curr.sitemap_downloaded, 'Descargado por Google')}`);
  lines.push(`  ${fmtBoolDelta(prev.sitemap_pending, curr.sitemap_pending, 'Pendiente de procesar')}`);
  if (curr.sitemap_error) lines.push(`  ADVERTENCIA: la consulta de sitemaps fallo (${curr.sitemap_error}) — estado no verificado.`);
  lines.push(
    `  Último envío: ${prev.sitemap_last_submitted ?? 'N/D'} -> ${curr.sitemap_last_submitted ?? 'N/D'}`,
  );
  lines.push('');

  lines.push('TRÁFICO (28d) — indicador secundario, no usar para reclamar impacto');
  const pImp = prev.impressions_28d ?? 0;
  const cImp = curr.impressions_28d ?? 0;
  const impDelta = cImp - pImp;
  const isNoise = Math.abs(impDelta) < 20 || cImp < 50;
  lines.push(
    `  Impresiones: ${prev.impressions_28d ?? 'N/D'} -> ${curr.impressions_28d ?? 'N/D'}` +
      (isNoise ? ' (ruido, muestra insuficiente)' : ` (cambio de ${impDelta > 0 ? '+' : ''}${impDelta})`),
  );
  lines.push(`  Clics: ${prev.clicks_28d ?? 'N/D'} -> ${curr.clicks_28d ?? 'N/D'}`);
  lines.push(`  Posición media: ${fmtPosition(prev.position_28d)} -> ${fmtPosition(curr.position_28d)}`);

  if (curr.note) {
    lines.push('');
    lines.push(`Nota (snapshot actual): ${curr.note}`);
  }
  return lines.join('\n');
}

function main() {
  const entries = loadEntries();
  if (entries.length === 0) {
    console.log('No hay snapshots todavía en seo-loop/metrics.jsonl. Ejecuta gsc-snapshot.mjs primero.');
    return;
  }
  if (entries.length === 1) {
    console.log(printBaseline(entries[0]));
    return;
  }
  const [prev, curr] = entries.slice(-2);
  console.log(printDelta(prev, curr));
}

try {
  main();
} catch (e) {
  console.log('No se pudo generar el informe de delta SEO:', e.message);
}
process.exit(0);
