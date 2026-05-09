/* ========================================================================
   Drive Routes Japan — main app
   ======================================================================== */

const CATEGORIES = [
  { id: 'scenic', label: '絶景ロード', color: '#4ECDC4', file: 'data/scenic.json' },
  { id: 'pass',   label: '峠道',       color: '#FF6B5B', file: 'data/pass.json'   },
  { id: 'kokudo', label: '酷道',       color: '#FFB52A', file: 'data/kokudo.json' },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const SVG_NS = 'http://www.w3.org/2000/svg';

const STATE = {
  segments: [],
  visibleCats: new Set(CATEGORIES.map((c) => c.id)),
  query: '',
  activeId: null,
  layers: new Map(),
};

/* ----------------------------------------------------------------------- */
/* MAP                                                                     */
/* ----------------------------------------------------------------------- */

const map = L.map('map', {
  zoomControl: false,
  preferCanvas: true,
  worldCopyJump: false,
}).setView([37.5, 137.5], 6);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">Carto</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

/* ----------------------------------------------------------------------- */
/* DATA LOADING                                                            */
/* ----------------------------------------------------------------------- */

async function loadAll() {
  const results = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const res = await fetch(cat.file);
      if (!res.ok) throw new Error(`Failed to load ${cat.file}`);
      const data = await res.json();
      return data.map((seg) => ({
        ...seg,
        category: cat.id,
        _key: `${cat.id}-${seg.id}`,
      }));
    })
  );
  STATE.segments = results.flat();
  render();
  hideLoading();
}

function hideLoading() {
  const el = document.getElementById('loading');
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 400);
}

/* ----------------------------------------------------------------------- */
/* MAP RENDERING                                                           */
/* ----------------------------------------------------------------------- */

function render() {
  STATE.layers.forEach((layer) => map.removeLayer(layer));
  STATE.layers.clear();

  const counts = { scenic: 0, pass: 0, kokudo: 0 };
  for (const seg of STATE.segments) counts[seg.category]++;
  document.getElementById('count-scenic').textContent = counts.scenic;
  document.getElementById('count-pass').textContent = counts.pass;
  document.getElementById('count-kokudo').textContent = counts.kokudo;

  const visible = STATE.segments.filter((seg) => STATE.visibleCats.has(seg.category));
  const filtered = filterByQuery(visible, STATE.query);

  for (const seg of visible) {
    if (!seg.polyline || seg.polyline.length < 2) continue;
    const cat = CAT_BY_ID[seg.category];
    const latlngs = seg.polyline.map((p) => [p.lat, p.lng]);

    const isActive = STATE.activeId === seg._key;
    const line = L.polyline(latlngs, {
      color: cat.color,
      weight: isActive ? 7 : 5,
      opacity: STATE.activeId && !isActive ? 0.4 : 1,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'route-line',
    });

    line.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      selectSegment(seg._key, { fly: false });
    });
    line.on('mouseover', () => line.setStyle({ weight: 7 }));
    line.on('mouseout', () => {
      if (STATE.activeId !== seg._key) line.setStyle({ weight: 5 });
    });

    line.addTo(map);
    STATE.layers.set(seg._key, line);
  }

  renderResultsList(filtered);
}

function filterByQuery(items, q) {
  if (!q) return items;
  const k = q.toLowerCase();
  return items.filter((seg) => {
    return (
      (seg.name || '').toLowerCase().includes(k) ||
      (seg.prefecture || '').toLowerCase().includes(k) ||
      (seg.description || '').toLowerCase().includes(k)
    );
  });
}

/* ----------------------------------------------------------------------- */
/* RESULTS LIST                                                            */
/* ----------------------------------------------------------------------- */

function renderResultsList(items) {
  const ul = document.getElementById('resultsList');
  ul.textContent = '';

  const sorted = items.slice().sort((a, b) => (b.length_km || 0) - (a.length_km || 0));
  const list = sorted.slice(0, 200);

  for (const seg of list) {
    const cat = CAT_BY_ID[seg.category];
    const li = document.createElement('li');
    li.className = 'result-item' + (seg._key === STATE.activeId ? ' active' : '');
    li.dataset.key = seg._key;
    li.style.setProperty('--c', cat.color);

    const swatch = document.createElement('span');
    swatch.className = 'result-swatch';
    li.appendChild(swatch);

    const text = document.createElement('div');
    text.className = 'result-text';
    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = seg.name || '';
    const meta = document.createElement('div');
    meta.className = 'result-meta';
    meta.textContent = [cat.label, seg.prefecture].filter(Boolean).join(' · ');
    text.appendChild(name);
    text.appendChild(meta);
    li.appendChild(text);

    const len = document.createElement('span');
    len.className = 'result-len';
    len.textContent = seg.length_km ? `${formatNumber(seg.length_km)} km` : '';
    li.appendChild(len);

    li.addEventListener('click', () => selectSegment(seg._key, { fly: true }));
    ul.appendChild(li);
  }

  if (list.length === 0) {
    const empty = document.createElement('li');
    empty.style.cssText = 'padding: 20px 10px; text-align: center; color: var(--navy-soft); font-size: 12px; font-weight: 600;';
    empty.textContent = '一致するルートがありません';
    ul.appendChild(empty);
  }
}

/* ----------------------------------------------------------------------- */
/* SELECTION & DETAIL SHEET                                                */
/* ----------------------------------------------------------------------- */

function selectSegment(key, { fly = true } = {}) {
  STATE.activeId = key;

  STATE.layers.forEach((layer, k) => {
    const cat = CAT_BY_ID[k.split('-')[0]];
    if (k === key) {
      layer.setStyle({ weight: 7, opacity: 1, color: cat.color });
      layer.bringToFront();
    } else {
      layer.setStyle({ weight: 5, opacity: 0.35, color: cat.color });
    }
  });

  const seg = STATE.segments.find((s) => s._key === key);
  if (!seg) return;

  if (fly && seg.polyline?.length) {
    const bounds = L.latLngBounds(seg.polyline.map((p) => [p.lat, p.lng]));
    // On mobile, the bottom-anchored detail sheet covers ~65% of the viewport.
    // Reserve that space so the active route stays in the visible map area.
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const padTop = isMobile ? [40, 80] : [60, 60];
    const padBottom = isMobile ? [40, Math.round(window.innerHeight * 0.62)] : [60, 60];
    map.flyToBounds(bounds, {
      paddingTopLeft: padTop,
      paddingBottomRight: padBottom,
      maxZoom: 13,
      duration: 0.8,
    });
  }

  showDetailSheet(seg);
  updateActiveListItem(key);
}

function clearSelection() {
  if (!STATE.activeId) return;
  STATE.activeId = null;
  STATE.layers.forEach((layer, k) => {
    const cat = CAT_BY_ID[k.split('-')[0]];
    layer.setStyle({ weight: 5, opacity: 1, color: cat.color });
  });
  hideDetailSheet();
  updateActiveListItem(null);
}

function updateActiveListItem(key) {
  document.querySelectorAll('.result-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === key);
  });
  if (key) {
    const el = document.querySelector(`.result-item[data-key="${key}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showDetailSheet(seg) {
  const cat = CAT_BY_ID[seg.category];
  const sheet = document.getElementById('detailSheet');
  sheet.dataset.cat = seg.category;
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-open');

  document.getElementById('sheetCat').textContent = cat.label;
  document.getElementById('sheetName').textContent = seg.name || '';
  document.getElementById('sheetPref').textContent = seg.prefecture || '';
  document.getElementById('sheetLength').textContent = seg.length_km
    ? `${formatNumber(seg.length_km)} km`
    : '—';

  const elevRange =
    seg.elevation_range != null
      ? `${Math.round(seg.elevation_range)} m`
      : seg.elevation_max != null && seg.elevation_min != null
      ? `${Math.round(seg.elevation_max - seg.elevation_min)} m`
      : '—';
  document.getElementById('sheetElevRange').textContent = elevRange;

  const elevHL =
    seg.elevation_max != null && seg.elevation_min != null
      ? `${Math.round(seg.elevation_max)} / ${Math.round(seg.elevation_min)} m`
      : '—';
  document.getElementById('sheetElevHL').textContent = elevHL;

  drawElevationProfile(seg.elevation_profile, seg.category);

  document.getElementById('sheetDesc').textContent = seg.description || '';
  document.getElementById('googleMapsBtn').href = buildGoogleMapsUrl(seg);
}

function hideDetailSheet() {
  document.getElementById('detailSheet').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('detail-open');
}

function drawElevationProfile(profile, category) {
  const host = document.getElementById('sheetElev');
  host.textContent = '';
  if (!profile || profile.length < 2) return;

  const valid = profile.filter((p) => p && p.el != null);
  if (valid.length < 2) return;

  const maxKm = profile[profile.length - 1]?.km ?? 1;
  const els = valid.map((p) => p.el);
  const minEl = Math.min(...els);
  const maxEl = Math.max(...els);
  const span = Math.max(1, maxEl - minEl);

  const W = 340;
  const H = 60;

  const points = valid.map((p) => {
    const x = (p.km / maxKm) * W;
    const y = H - ((p.el - minEl) / span) * H;
    return [x, y];
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`)
    .join(' ');
  const fillPath = `${linePath} L${W},${H} L0,${H} Z`;

  const colorMap = { scenic: '#4ECDC4', pass: '#FF6B5B', kokudo: '#FFB52A' };
  const color = colorMap[category] || '#4ECDC4';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  const gradId = `elev-grad-${category}`;
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');
  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', color);
  stop1.setAttribute('stop-opacity', '0.45');
  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', color);
  stop2.setAttribute('stop-opacity', '0');
  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  const fill = document.createElementNS(SVG_NS, 'path');
  fill.setAttribute('d', fillPath);
  fill.setAttribute('fill', `url(#${gradId})`);
  svg.appendChild(fill);

  const line = document.createElementNS(SVG_NS, 'path');
  line.setAttribute('d', linePath);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '1.6');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(line);

  host.appendChild(svg);
}

function buildGoogleMapsUrl(seg) {
  if (!seg.polyline?.length) return '#';
  const poly = seg.polyline;
  const origin = `${poly[0].lat},${poly[0].lng}`;
  const destination = `${poly[poly.length - 1].lat},${poly[poly.length - 1].lng}`;

  // Up to 8 evenly-spaced waypoints (Google Maps URL limit is ~9 stops)
  const inner = poly.slice(1, -1);
  const maxWaypoints = 8;
  const sampled = [];
  if (inner.length > 0) {
    const step = Math.max(1, Math.floor(inner.length / (maxWaypoints + 1)));
    for (let i = step; i < inner.length && sampled.length < maxWaypoints; i += step) {
      sampled.push(inner[i]);
    }
  }
  const waypoints = sampled.map((p) => `${p.lat},${p.lng}`).join('|');

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  if (waypoints) url.searchParams.set('waypoints', waypoints);
  url.searchParams.set('travelmode', 'driving');
  return url.toString();
}

function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/* ----------------------------------------------------------------------- */
/* EVENT WIRING                                                            */
/* ----------------------------------------------------------------------- */

document.querySelectorAll('.pill[data-cat]').forEach((pill) => {
  pill.addEventListener('click', () => {
    const cat = pill.dataset.cat;
    const next = pill.getAttribute('aria-pressed') !== 'true';
    pill.setAttribute('aria-pressed', String(next));
    if (next) STATE.visibleCats.add(cat);
    else STATE.visibleCats.delete(cat);
    if (STATE.activeId && STATE.activeId.startsWith(`${cat}-`) && !next) clearSelection();
    render();
  });
});

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  STATE.query = e.target.value.trim();
  const visible = STATE.segments.filter((seg) => STATE.visibleCats.has(seg.category));
  renderResultsList(filterByQuery(visible, STATE.query));
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape') {
    if (STATE.activeId) clearSelection();
  }
});

document.getElementById('sheetClose').addEventListener('click', clearSelection);

document.getElementById('zoomBtn').addEventListener('click', () => {
  if (!STATE.activeId) return;
  const seg = STATE.segments.find((s) => s._key === STATE.activeId);
  if (!seg?.polyline?.length) return;
  const bounds = L.latLngBounds(seg.polyline.map((p) => [p.lat, p.lng]));
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  map.fitBounds(bounds, {
    paddingTopLeft: isMobile ? [30, 80] : [40, 40],
    paddingBottomRight: isMobile ? [30, Math.round(window.innerHeight * 0.62)] : [40, 40],
    maxZoom: 14,
  });
});

map.on('click', clearSelection);

const aboutDialog = document.getElementById('aboutDialog');
document.getElementById('aboutBtn').addEventListener('click', () => aboutDialog.showModal());
aboutDialog.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => aboutDialog.close())
);
aboutDialog.addEventListener('click', (e) => {
  if (e.target === aboutDialog) aboutDialog.close();
});

/* ----------------------------------------------------------------------- */
/* BOOT                                                                    */
/* ----------------------------------------------------------------------- */

loadAll().catch((err) => {
  console.error(err);
  const inner = document.querySelector('#loading .loading-inner');
  if (inner) {
    inner.textContent = '';
    const p1 = document.createElement('p');
    p1.style.color = 'var(--c-pass)';
    p1.textContent = 'データの読み込みに失敗しました';
    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size: 11px; margin-top: 8px; color: var(--muted);';
    p2.textContent = err.message;
    inner.appendChild(p1);
    inner.appendChild(p2);
  }
});
