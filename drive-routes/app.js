/* ========================================================================
   Drive Routes Japan — main app
   ======================================================================== */

const CATEGORIES = [
  { id: 'scenic', label: '絶景ロード', color: '#4ECDC4', file: 'data/scenic.json' },
  { id: 'pass',   label: '峠道',       color: '#FF6B5B', file: 'data/pass.json' },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const SVG_NS = 'http://www.w3.org/2000/svg';

const STATE = {
  segments: [],
  visibleCats: new Set(CATEGORIES.map((c) => c.id)),
  query: '',
  activeId: null,
  layers: new Map(),
  sortBy: 'length', // 'length' | 'nearest' | 'north-south' | 'south-north'
  userLocation: null, // { lat, lng } when granted
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
  // Fetch engagement state in parallel — failure is non-fatal.
  await Promise.allSettled([refreshLikeCounts(), refreshMyLikes()]);
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
  STATE.layers.forEach((layer) => {
    if (layer._hit) map.removeLayer(layer._hit);
    map.removeLayer(layer);
  });
  STATE.layers.clear();

  const counts = { scenic: 0, pass: 0 };
  for (const seg of STATE.segments) counts[seg.category]++;
  for (const cat of CATEGORIES) {
    const el = document.getElementById(`count-${cat.id}`);
    if (el) el.textContent = counts[cat.id] ?? 0;
  }

  const visible = STATE.segments.filter((seg) => STATE.visibleCats.has(seg.category));
  const filtered = filterByQuery(visible, STATE.query);

  // Touch devices need a much larger hit target than the visual stroke width.
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const HIT_WEIGHT = isCoarsePointer ? 36 : 22;

  for (const seg of visible) {
    if (!seg.polyline || seg.polyline.length < 2) continue;
    const cat = CAT_BY_ID[seg.category];
    const latlngs = seg.polyline.map((p) => [p.lat, p.lng]);

    const isActive = STATE.activeId === seg._key;

    // Visible stroke — purely decorative, no pointer events.
    const line = L.polyline(latlngs, {
      color: cat.color,
      weight: isActive ? 7 : 5,
      opacity: STATE.activeId && !isActive ? 0.4 : 1,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'route-line',
      interactive: false,
    });

    // Wider invisible "hit" polyline catches taps that miss the thin line.
    const hit = L.polyline(latlngs, {
      weight: HIT_WEIGHT,
      opacity: 0,
      color: cat.color,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: true,
      bubblingMouseEvents: false,
      className: 'route-hit',
    });

    hit.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      selectSegment(seg._key, { fly: false });
    });
    hit.on('mouseover', () => line.setStyle({ weight: 7 }));
    hit.on('mouseout', () => {
      if (STATE.activeId !== seg._key) line.setStyle({ weight: 5 });
    });

    hit.addTo(map);
    line.addTo(map);
    line._hit = hit;
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

function segmentMidpoint(seg) {
  const poly = seg.polyline;
  if (!poly || poly.length === 0) return null;
  if (seg._midCache) return seg._midCache;
  const mid = poly[Math.floor(poly.length / 2)];
  seg._midCache = { lat: mid.lat, lng: mid.lng };
  return seg._midCache;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function sortSegments(items) {
  const sorted = items.slice();
  switch (STATE.sortBy) {
    case 'nearest': {
      if (!STATE.userLocation) return sorted;
      const here = STATE.userLocation;
      sorted.sort((a, b) => {
        const ma = segmentMidpoint(a);
        const mb = segmentMidpoint(b);
        const da = ma ? haversineKm(here, ma) : Infinity;
        const db = mb ? haversineKm(here, mb) : Infinity;
        return da - db;
      });
      return sorted;
    }
    case 'north-south': {
      sorted.sort((a, b) => {
        const ma = segmentMidpoint(a);
        const mb = segmentMidpoint(b);
        return (mb?.lat ?? -Infinity) - (ma?.lat ?? -Infinity);
      });
      return sorted;
    }
    case 'south-north': {
      sorted.sort((a, b) => {
        const ma = segmentMidpoint(a);
        const mb = segmentMidpoint(b);
        return (ma?.lat ?? Infinity) - (mb?.lat ?? Infinity);
      });
      return sorted;
    }
    case 'length':
    default:
      sorted.sort((a, b) => (b.length_km || 0) - (a.length_km || 0));
      return sorted;
  }
}

function renderResultsList(items) {
  const ul = document.getElementById('resultsList');
  ul.textContent = '';

  const list = sortSegments(items);

  for (const seg of list) {
    const cat = CAT_BY_ID[seg.category];
    const li = document.createElement('li');
    li.className = 'result-card' + (seg._key === STATE.activeId ? ' active' : '');
    li.dataset.key = seg._key;
    li.dataset.cat = seg.category;
    li.style.setProperty('--c', cat.color);

    if (seg.cover_image) {
      const img = document.createElement('img');
      img.className = 'result-card-bg';
      img.src = `images/${seg.cover_image}`;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => { img.remove(); li.classList.add('no-image'); };
      li.appendChild(img);
    } else {
      li.classList.add('no-image');
    }

    const scrim = document.createElement('div');
    scrim.className = 'result-card-scrim';
    li.appendChild(scrim);

    const topRow = document.createElement('div');
    topRow.className = 'result-card-top';
    const catBadge = document.createElement('span');
    catBadge.className = 'result-card-cat';
    catBadge.textContent = cat.label;
    topRow.appendChild(catBadge);
    if (seg.prefecture) {
      const pref = document.createElement('span');
      pref.className = 'result-card-pref';
      pref.textContent = seg.prefecture;
      topRow.appendChild(pref);
    }
    li.appendChild(topRow);

    const bottom = document.createElement('div');
    bottom.className = 'result-card-bottom';
    const name = document.createElement('div');
    name.className = 'result-card-name';
    name.textContent = seg.name || '';
    bottom.appendChild(name);

    const stats = document.createElement('div');
    stats.className = 'result-card-stats';
    if (seg.length_km) {
      const len = document.createElement('span');
      len.className = 'result-card-stat result-card-stat-len';
      const lenIcon = document.createElement('span');
      lenIcon.setAttribute('aria-hidden', 'true');
      lenIcon.textContent = '📏';
      len.appendChild(lenIcon);
      len.appendChild(document.createTextNode(` ${formatNumber(seg.length_km)} km`));
      stats.appendChild(len);
    }
    const elevDiff =
      seg.elevation_range != null
        ? Math.round(seg.elevation_range)
        : seg.elevation_max != null && seg.elevation_min != null
        ? Math.round(seg.elevation_max - seg.elevation_min)
        : null;
    if (elevDiff != null) {
      const elev = document.createElement('span');
      elev.className = 'result-card-stat result-card-stat-elev';
      const elevIcon = document.createElement('span');
      elevIcon.setAttribute('aria-hidden', 'true');
      elevIcon.textContent = '⛰️';
      elev.appendChild(elevIcon);
      elev.appendChild(document.createTextNode(` ${elevDiff} m`));
      stats.appendChild(elev);
    }
    if (stats.childElementCount > 0) bottom.appendChild(stats);
    li.appendChild(bottom);

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
      // Bring both the hit polyline and the visible stroke to the top so the
      // active route's tap zone wins over neighbouring overlapping routes.
      if (layer._hit) layer._hit.bringToFront();
      layer.bringToFront();
    } else {
      layer.setStyle({ weight: 5, opacity: 0.35, color: cat.color });
    }
  });

  const seg = STATE.segments.find((s) => s._key === key);
  if (!seg) return;

  if (fly && seg.polyline?.length) {
    const bounds = L.latLngBounds(seg.polyline.map((p) => [p.lat, p.lng]));
    // On mobile, the bottom-anchored detail sheet covers ~60vh of the viewport.
    // Reserve that space so the active route stays in the visible map area.
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const padTop = isMobile ? [24, 72] : [60, 60];
    const padBottom = isMobile
      ? [24, Math.round(window.innerHeight * 0.6) + 16]
      : [60, 60];
    map.flyToBounds(bounds, {
      paddingTopLeft: padTop,
      paddingBottomRight: padBottom,
      maxZoom: 13,
      duration: 0.8,
    });
  }

  showDetailSheet(seg);
  updateEngagementUI(seg);
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
  document.querySelectorAll('.result-card').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === key);
  });
  if (key) {
    const el = document.querySelector(`.result-card[data-key="${key}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showDetailSheet(seg) {
  const cat = CAT_BY_ID[seg.category];
  const sheet = document.getElementById('detailSheet');
  sheet.dataset.cat = seg.category;
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-open');
  if (!document.body.classList.contains('sheet-full')) setSheetMode('half');

  const hero = document.getElementById('sheetHero');
  const heroImg = document.getElementById('sheetHeroImg');
  const heroCaption = document.getElementById('sheetHeroCaption');
  if (seg.cover_image) {
    heroImg.src = `images/${seg.cover_image}`;
    heroImg.alt = seg.name || '';
    hero.classList.remove('no-image');
    hero.setAttribute('aria-hidden', 'false');
    const attr = seg.cover_attribution;
    if (attr && (attr.author || attr.title || attr.source_url)) {
      const parts = [];
      if (attr.title) parts.push(attr.title);
      if (attr.author) parts.push(attr.author);
      heroCaption.textContent = parts.length ? `© ${parts.join(' / ')}` : '';
      heroCaption.hidden = parts.length === 0;
    } else {
      heroCaption.textContent = '';
      heroCaption.hidden = true;
    }
  } else {
    heroImg.removeAttribute('src');
    heroImg.alt = '';
    hero.classList.add('no-image');
    hero.setAttribute('aria-hidden', 'true');
    heroCaption.textContent = '';
    heroCaption.hidden = true;
  }

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
  document.body.classList.remove('detail-open', 'sheet-full', 'sheet-half');
}

function drawElevationProfile(profile, category) {
  const host = document.getElementById('sheetElev');
  host.textContent = '';
  host.classList.remove('elev-host');
  if (!profile || profile.length < 2) return;

  const valid = profile.filter((p) => p && p.el != null);
  if (valid.length < 2) return;

  const maxKm = profile[profile.length - 1]?.km ?? 1;
  const els = valid.map((p) => p.el);
  const minEl = Math.min(...els);
  const maxEl = Math.max(...els);
  const span = Math.max(1, maxEl - minEl);

  const colorMap = { scenic: '#4ECDC4', pass: '#FF6B5B' };
  const color = colorMap[category] || '#4ECDC4';

  // The host needs explicit class for layout: y-axis column + plot column + x-axis row.
  host.classList.add('elev-host');

  // Y-axis column (left): max top, min bottom.
  const yAxis = document.createElement('div');
  yAxis.className = 'elev-y';
  const yMax = document.createElement('span');
  yMax.textContent = `${Math.round(maxEl)} m`;
  const yMin = document.createElement('span');
  yMin.textContent = `${Math.round(minEl)} m`;
  yAxis.appendChild(yMax);
  yAxis.appendChild(yMin);
  host.appendChild(yAxis);

  // Plot column — SVG stretches; axis labels are HTML overlays so they stay crisp.
  const plot = document.createElement('div');
  plot.className = 'elev-plot';

  const W = 100; // arbitrary; we draw in 100x100 viewBox and let it stretch via preserveAspectRatio=none.
  const H = 100;
  const points = valid.map((p) => {
    const x = (p.km / maxKm) * W;
    const y = H - ((p.el - minEl) / span) * H;
    return [x, y];
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(2)},${pt[1].toFixed(2)}`)
    .join(' ');
  const fillPath = `${linePath} L${W},${H} L0,${H} Z`;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'elev-svg');

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
  line.setAttribute('stroke-width', '1.5');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(line);

  plot.appendChild(svg);
  host.appendChild(plot);

  // X-axis row (below plot, aligned to the plot column).
  const xAxis = document.createElement('div');
  xAxis.className = 'elev-x';
  const x0 = document.createElement('span');
  x0.textContent = '0 km';
  const xMid = document.createElement('span');
  xMid.textContent = `${formatNumber(maxKm / 2)} km`;
  const xMax = document.createElement('span');
  xMax.textContent = `${formatNumber(maxKm)} km`;
  xAxis.appendChild(x0);
  xAxis.appendChild(xMid);
  xAxis.appendChild(xMax);
  host.appendChild(xAxis);
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

/* ----------------------------------------------------------------------- */
/* SORT PILLS                                                              */
/* ----------------------------------------------------------------------- */

function setSortHint(text, tone) {
  const el = document.getElementById('sortHint');
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('hint-err', 'hint-info');
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle('hint-err', tone === 'err');
  el.classList.toggle('hint-info', tone === 'info');
}

function applySort(sortKey) {
  STATE.sortBy = sortKey;
  document.querySelectorAll('.sort-pill').forEach((p) => {
    const on = p.dataset.sort === sortKey;
    p.classList.toggle('active', on);
    p.setAttribute('aria-pressed', String(on));
  });
  render();
}

function requestUserLocationAndSort() {
  if (!('geolocation' in navigator)) {
    setSortHint('この端末では位置情報を取得できません。距離が長い順に戻します。', 'err');
    applySort('length');
    return;
  }
  setSortHint('現在地を取得中…', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      STATE.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSortHint(`現在地から近い順 (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`, 'info');
      applySort('nearest');
    },
    (err) => {
      const msg = err.code === err.PERMISSION_DENIED
        ? '位置情報の許可が得られませんでした。距離が長い順に戻します。'
        : '現在地を取得できませんでした。距離が長い順に戻します。';
      setSortHint(msg, 'err');
      // Revert UI to length
      applySort('length');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
  );
}

document.querySelectorAll('.sort-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const key = pill.dataset.sort;
    if (key === 'nearest') {
      if (STATE.userLocation) {
        applySort('nearest');
        setSortHint(null);
      } else {
        requestUserLocationAndSort();
      }
      return;
    }
    setSortHint(null);
    applySort(key);
  });
});

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
    if (document.body.classList.contains('sheet-full')) {
      setSheetMode('half');
    } else if (STATE.activeId) {
      clearSelection();
    }
  }
  if (STATE.activeId && document.activeElement !== searchInput) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigateSegment(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigateSegment(1); }
  }
});

document.getElementById('sheetClose').addEventListener('click', () => {
  // Full → half. Half → close.
  if (document.body.classList.contains('sheet-full')) {
    setSheetMode('half');
  } else {
    clearSelection();
  }
});

/* ----------------------------------------------------------------------- */
/* DOCK OPEN/CLOSE & BOTTOM-SHEET DRAG (mobile)                            */
/* ----------------------------------------------------------------------- */

const dockOpenFab = document.getElementById('dockOpen');
const dockEl = document.querySelector('.filter-dock');
const dockGrip = document.getElementById('dockGrip');
const DOCK_STATES = ['closed', 'half', 'full'];
const mobileMQ = window.matchMedia('(max-width: 720px)');

function isMobile() { return mobileMQ.matches; }

// Mobile: state is one of "half" | "full" | "closed".
// Desktop: only "open" vs "closed" matters.
function setDockState(state) {
  const body = document.body;
  body.classList.remove('dock-closed', 'dock-half', 'dock-full');
  if (state === 'closed') {
    body.classList.add('dock-closed');
  } else if (isMobile()) {
    body.classList.add(state === 'full' ? 'dock-full' : 'dock-half');
  }
  dockOpenFab.hidden = state !== 'closed';
}

function setDockClosed(closed) {
  setDockState(closed ? 'closed' : (isMobile() ? 'half' : 'open'));
}

document.getElementById('dockClose').addEventListener('click', () => setDockState('closed'));
dockOpenFab.addEventListener('click', () => setDockState(isMobile() ? 'half' : 'open'));

// Initialize: mobile defaults to half-open bottom sheet so users see the map and the cards.
setDockState(isMobile() ? 'half' : 'open');

// Drag-to-resize on mobile via the grip handle.
(() => {
  let pointerId = null;
  let startY = 0;
  let startTranslate = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;
  let dockHeight = 0;

  function currentTranslatePx() {
    // Translate is expressed as % of dock height in CSS; compute current px.
    if (document.body.classList.contains('dock-full')) return 0;
    if (document.body.classList.contains('dock-closed')) return dockHeight;
    return dockHeight * 0.5; // half
  }

  function onDown(e) {
    if (!isMobile()) return;
    pointerId = e.pointerId;
    dockHeight = dockEl.getBoundingClientRect().height;
    startY = e.clientY;
    lastY = e.clientY;
    lastT = e.timeStamp;
    velocity = 0;
    startTranslate = currentTranslatePx();
    dockEl.classList.add('dragging');
    dockGrip.setPointerCapture(pointerId);
  }

  function onMove(e) {
    if (pointerId == null) return;
    const dy = e.clientY - startY;
    const next = Math.max(0, Math.min(dockHeight, startTranslate + dy));
    dockEl.style.transform = `translateY(${next}px)`;
    velocity = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
    lastY = e.clientY;
    lastT = e.timeStamp;
  }

  function onUp(e) {
    if (pointerId == null) return;
    try { dockGrip.releasePointerCapture(pointerId); } catch {}
    pointerId = null;
    dockEl.classList.remove('dragging');
    dockEl.style.transform = '';

    const endPx = Math.max(0, Math.min(dockHeight, startTranslate + (e.clientY - startY)));
    const ratio = endPx / dockHeight;

    // Flick-based snap: fast downward flick → close, fast upward → full.
    if (velocity > 0.8) return setDockState('closed');
    if (velocity < -0.8) return setDockState('full');

    // Position-based snap.
    if (ratio < 0.25) setDockState('full');
    else if (ratio < 0.78) setDockState('half');
    else setDockState('closed');
  }

  dockGrip.addEventListener('pointerdown', onDown);
  dockGrip.addEventListener('pointermove', onMove);
  dockGrip.addEventListener('pointerup', onUp);
  dockGrip.addEventListener('pointercancel', onUp);
  // Double-tap on the grip toggles between half and full.
  dockGrip.addEventListener('dblclick', () => {
    if (!isMobile()) return;
    setDockState(document.body.classList.contains('dock-full') ? 'half' : 'full');
  });
})();

document.getElementById('zoomBtn').addEventListener('click', () => {
  if (!STATE.activeId) return;
  const seg = STATE.segments.find((s) => s._key === STATE.activeId);
  if (!seg?.polyline?.length) return;
  const bounds = L.latLngBounds(seg.polyline.map((p) => [p.lat, p.lng]));
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  map.fitBounds(bounds, {
    paddingTopLeft: isMobile ? [24, 72] : [40, 40],
    paddingBottomRight: isMobile
      ? [24, Math.round(window.innerHeight * 0.6) + 16]
      : [40, 40],
    maxZoom: 14,
  });
});

/* ----------------------------------------------------------------------- */
/* SWIPE NAVIGATION — next/prev route on the detail sheet                  */
/* ----------------------------------------------------------------------- */

function getVisibleSegmentList() {
  const visible = STATE.segments.filter((seg) => STATE.visibleCats.has(seg.category));
  const filtered = filterByQuery(visible, STATE.query);
  return sortSegments(filtered);
}

function navigateSegment(delta) {
  if (!STATE.activeId) return;
  const list = getVisibleSegmentList();
  if (list.length < 2) return;
  const idx = list.findIndex((s) => s._key === STATE.activeId);
  if (idx < 0) return;
  const nextIdx = (idx + delta + list.length) % list.length;
  const next = list[nextIdx];
  if (next) selectSegment(next._key, { fly: true });
}

document.getElementById('swipePrevBtn').addEventListener('click', () => navigateSegment(-1));
document.getElementById('swipeNextBtn').addEventListener('click', () => navigateSegment(1));

function setSheetMode(mode) {
  // 'half' | 'full'
  const body = document.body;
  body.classList.toggle('sheet-full', mode === 'full');
  body.classList.toggle('sheet-half', mode === 'half');
}

(() => {
  const sheet = document.getElementById('detailSheet');
  let startX = 0;
  let startY = 0;
  let lastDx = 0;
  let lastDy = 0;
  let tracking = false;
  let axis = null; // 'x' | 'y' | null
  let pointerId = null;

  function shouldIgnore(target) {
    // Don't hijack swipes on interactive controls.
    return target.closest('button, a, input, textarea');
  }

  function resetTransform(animate = true) {
    if (animate) sheet.classList.add('swipe-snap');
    sheet.style.removeProperty('--swipe-dx');
    sheet.style.removeProperty('--swipe-dy');
    sheet.style.removeProperty('--swipe-opacity');
    if (animate) {
      setTimeout(() => sheet.classList.remove('swipe-snap'), 260);
    }
  }

  function animateOut(direction, onDone) {
    sheet.classList.add('swipe-snap');
    const w = sheet.getBoundingClientRect().width || window.innerWidth;
    sheet.style.setProperty('--swipe-dx', `${direction * w}px`);
    sheet.style.setProperty('--swipe-opacity', '0');
    setTimeout(() => {
      sheet.style.removeProperty('--swipe-dx');
      sheet.style.removeProperty('--swipe-opacity');
      sheet.classList.remove('swipe-snap');
      onDone();
    }, 220);
  }

  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (sheet.getAttribute('aria-hidden') === 'true') return;
    if (shouldIgnore(e.target)) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastDx = 0;
    lastDy = 0;
    tracking = true;
    axis = null;
  });

  sheet.addEventListener('pointermove', (e) => {
    if (!tracking || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (axis == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      sheet.classList.add('swipe-dragging');
      try { sheet.setPointerCapture(pointerId); } catch {}
    }
    e.preventDefault();
    if (axis === 'x') {
      lastDx = dx;
      sheet.style.setProperty('--swipe-dx', `${dx}px`);
      const w = sheet.getBoundingClientRect().width || 1;
      const op = Math.max(0.35, 1 - Math.abs(dx) / w * 0.9);
      sheet.style.setProperty('--swipe-opacity', String(op));
    } else {
      lastDy = dy;
      const isFull = document.body.classList.contains('sheet-full');
      // In half state we only react to drag up; in full state only drag down.
      const visible = isFull ? Math.max(0, dy) : Math.min(0, dy);
      sheet.style.setProperty('--swipe-dy', `${visible}px`);
    }
  }, { passive: false });

  function onEnd(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    tracking = false;
    try { sheet.releasePointerCapture(pointerId); } catch {}
    sheet.classList.remove('swipe-dragging');
    if (axis === 'x') {
      const w = sheet.getBoundingClientRect().width || 1;
      const ratio = Math.abs(lastDx) / w;
      if (ratio > 0.22) {
        const dir = lastDx < 0 ? 1 : -1;
        animateOut(-dir, () => navigateSegment(dir));
      } else {
        resetTransform(true);
      }
    } else if (axis === 'y') {
      const isFull = document.body.classList.contains('sheet-full');
      const h = window.innerHeight;
      const ratio = Math.abs(lastDy) / h;
      if (isFull && lastDy > 0 && ratio > 0.12) {
        setSheetMode('half');
      } else if (!isFull && lastDy < 0 && ratio > 0.08) {
        setSheetMode('full');
      }
      resetTransform(true);
    } else {
      resetTransform(false);
    }
    axis = null;
  }

  sheet.addEventListener('pointerup', onEnd);
  sheet.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointerId) return;
    tracking = false;
    axis = null;
    sheet.classList.remove('swipe-dragging');
    resetTransform(true);
  });
})();

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
/* ENGAGEMENT — likes, comments, ranking                                   */
/* ----------------------------------------------------------------------- */

STATE.likeCounts = new Map();   // route_key -> count
STATE.myLikes = new Set();      // route_key (this device has liked)
STATE.commentsCache = new Map(); // route_key -> comments[]

async function refreshLikeCounts() {
  if (!window.engagementAPI) return;
  try {
    const rows = await window.engagementAPI.fetchLikeCounts();
    STATE.likeCounts = new Map(rows.map((r) => [r.route_key, r.like_count]));
  } catch (e) {
    console.warn('[engagement] fetchLikeCounts failed', e);
  }
}

async function refreshMyLikes() {
  if (!window.engagementAPI) return;
  try {
    STATE.myLikes = await window.engagementAPI.fetchMyLikes();
  } catch (e) {
    console.warn('[engagement] fetchMyLikes failed', e);
  }
}

function getLikeCount(routeKey) {
  return STATE.likeCounts.get(routeKey) || 0;
}

function updateLikeUI(routeKey) {
  const btn = document.getElementById('likeBtn');
  const count = document.getElementById('likeCount');
  if (!btn || !count) return;
  const liked = STATE.myLikes.has(routeKey);
  btn.classList.toggle('liked', liked);
  btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
  count.textContent = String(getLikeCount(routeKey));
}

async function handleLikeClick() {
  if (!STATE.activeId || !window.engagementAPI) return;
  const seg = STATE.segments.find((s) => s._key === STATE.activeId);
  if (!seg) return;
  const btn = document.getElementById('likeBtn');
  btn.disabled = true;
  try {
    const result = await window.engagementAPI.toggleLike(seg._key, seg.category);
    if (result.liked) STATE.myLikes.add(seg._key);
    else STATE.myLikes.delete(seg._key);
    STATE.likeCounts.set(seg._key, result.like_count);
    updateLikeUI(seg._key);
  } catch (e) {
    console.warn('[engagement] toggleLike failed', e);
    alert('いいねを保存できませんでした。時間を置いて再度お試しください。');
  } finally {
    btn.disabled = false;
  }
}

function fmtRelativeTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'たった今';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString('ja-JP');
}

function renderComments(_routeKey, comments) {
  const list = document.getElementById('commentsList');
  const countEl = document.getElementById('commentsCount');
  list.textContent = '';
  countEl.textContent = `コメント ${comments.length}`;
  if (comments.length === 0) {
    const li = document.createElement('li');
    li.className = 'comment-empty';
    li.textContent = '最初のコメントを投稿してみよう。';
    list.appendChild(li);
    return;
  }
  for (const c of comments) {
    const li = document.createElement('li');
    li.className = 'comment-item';
    const head = document.createElement('div');
    head.className = 'comment-head';
    const nick = document.createElement('span');
    nick.className = 'comment-nick';
    nick.textContent = c.nickname;
    const when = document.createElement('time');
    when.className = 'comment-time';
    when.dateTime = c.created_at;
    when.textContent = fmtRelativeTime(c.created_at);
    head.appendChild(nick);
    head.appendChild(when);
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = c.body;
    li.appendChild(head);
    li.appendChild(body);
    list.appendChild(li);
  }
}

async function loadCommentsFor(routeKey) {
  if (!window.engagementAPI) return;
  try {
    const list = await window.engagementAPI.fetchComments(routeKey);
    STATE.commentsCache.set(routeKey, list);
    if (STATE.activeId === routeKey) renderComments(routeKey, list);
  } catch (e) {
    console.warn('[engagement] fetchComments failed', e);
  }
}

function updateEngagementUI(seg) {
  updateLikeUI(seg._key);
  const cached = STATE.commentsCache.get(seg._key);
  if (cached) renderComments(seg._key, cached);
  else {
    document.getElementById('commentsList').textContent = '';
    document.getElementById('commentsCount').textContent = 'コメント …';
    loadCommentsFor(seg._key);
  }
  // Reset form
  document.getElementById('commentStatus').textContent = '';
  // Restore last nickname for convenience
  const lastNick = localStorage.getItem('tf_last_nickname') || '';
  document.getElementById('commentNickname').value = lastNick;
  document.getElementById('commentBody').value = '';
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!STATE.activeId || !window.engagementAPI) return;
  const seg = STATE.segments.find((s) => s._key === STATE.activeId);
  if (!seg) return;
  const nick = document.getElementById('commentNickname').value.trim();
  const body = document.getElementById('commentBody').value.trim();
  const status = document.getElementById('commentStatus');
  if (!nick || !body) {
    status.textContent = 'ニックネームと本文を入力してください。';
    return;
  }
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  status.textContent = '送信中…';
  try {
    await window.engagementAPI.addComment(seg._key, seg.category, nick, body);
    localStorage.setItem('tf_last_nickname', nick);
    document.getElementById('commentBody').value = '';
    status.textContent = '投稿しました ✓';
    setTimeout(() => { status.textContent = ''; }, 2200);
    await loadCommentsFor(seg._key);
  } catch (err) {
    console.warn('[engagement] addComment failed', err);
    const msg = (err && err.message) || '';
    if (msg.includes('rate_limited')) {
      status.textContent = '少し時間を置いてから投稿してください。';
    } else if (msg.includes('invalid_')) {
      status.textContent = '入力内容を確認してください。';
    } else {
      status.textContent = '送信に失敗しました。';
    }
  } finally {
    submitBtn.disabled = false;
  }
}

function setupEngagementUI() {
  const likeBtn = document.getElementById('likeBtn');
  if (likeBtn) likeBtn.addEventListener('click', handleLikeClick);

  const commentForm = document.getElementById('commentForm');
  if (commentForm) commentForm.addEventListener('submit', handleCommentSubmit);
}

/* ----- RANKING ----- */

function buildHeartIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 21s-7.5-4.6-10-9.5C0 7.4 2.4 4 5.8 4c2 0 3.7 1.1 4.7 2.7C11.5 5.1 13.2 4 15.2 4 18.6 4 21 7.4 19 11.5 17 16.4 12 21 12 21z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

function getRankingFor(tab) {
  return STATE.segments
    .filter((s) => tab === 'all' || s.category === tab)
    .map((s) => ({ seg: s, count: getLikeCount(s._key) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function renderRanking(tab) {
  const ol = document.getElementById('rankingList');
  ol.textContent = '';
  const items = getRankingFor(tab);
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'ranking-empty';
    li.textContent = 'まだいいねされたルートがありません。気に入ったルートにハートを押してみよう。';
    ol.appendChild(li);
    return;
  }
  items.forEach((r, idx) => {
    const seg = r.seg;
    const cat = CAT_BY_ID[seg.category];
    const li = document.createElement('li');
    li.className = 'ranking-item';
    li.style.setProperty('--c', cat.color);
    li.dataset.key = seg._key;

    const rank = document.createElement('span');
    rank.className = 'ranking-rank';
    if (idx === 0) rank.classList.add('rank-gold');
    else if (idx === 1) rank.classList.add('rank-silver');
    else if (idx === 2) rank.classList.add('rank-bronze');
    rank.textContent = String(idx + 1);

    const body = document.createElement('div');
    body.className = 'ranking-body';
    const name = document.createElement('div');
    name.className = 'ranking-name';
    name.textContent = seg.name || '(no name)';
    const meta = document.createElement('div');
    meta.className = 'ranking-meta';
    const catLabel = document.createElement('span');
    catLabel.className = 'ranking-cat';
    catLabel.textContent = cat.label;
    meta.appendChild(catLabel);
    if (seg.prefecture) {
      const pref = document.createElement('span');
      pref.className = 'ranking-pref';
      pref.textContent = seg.prefecture;
      meta.appendChild(pref);
    }
    body.appendChild(name);
    body.appendChild(meta);

    const likes = document.createElement('div');
    likes.className = 'ranking-likes';
    likes.appendChild(buildHeartIcon());
    const cnt = document.createElement('span');
    cnt.textContent = String(r.count);
    likes.appendChild(cnt);

    li.appendChild(rank);
    li.appendChild(body);
    li.appendChild(likes);

    li.addEventListener('click', () => {
      closeRanking();
      selectSegment(seg._key, { fly: true });
    });

    ol.appendChild(li);
  });
}

function openRanking() {
  // Refresh latest counts before showing (cheap, fewer than 400 rows in the view).
  refreshLikeCounts().finally(() => {
    document.getElementById('rankingSheet').setAttribute('aria-hidden', 'false');
    document.getElementById('rankingBackdrop').setAttribute('aria-hidden', 'false');
    document.body.classList.add('ranking-open');
    const activeTab = document.querySelector('.ranking-tab.active')?.dataset.tab || 'all';
    renderRanking(activeTab);
  });
}

function closeRanking() {
  document.getElementById('rankingSheet').setAttribute('aria-hidden', 'true');
  document.getElementById('rankingBackdrop').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ranking-open');
}

function setupRankingUI() {
  document.getElementById('rankingBtn')?.addEventListener('click', openRanking);
  document.getElementById('rankingClose')?.addEventListener('click', closeRanking);
  document.getElementById('rankingBackdrop')?.addEventListener('click', closeRanking);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('ranking-open')) closeRanking();
  });
  document.querySelectorAll('.ranking-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ranking-tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      renderRanking(tab.dataset.tab);
    });
  });
}

/* ----------------------------------------------------------------------- */
/* BOOT                                                                    */
/* ----------------------------------------------------------------------- */

setupEngagementUI();
setupRankingUI();

loadAll().catch((err) => {
  console.error(err);
  const inner = document.querySelector('#loading .loading-inner');
  if (inner) {
    inner.textContent = '';
    const p1 = document.createElement('p');
    p1.style.color = 'var(--c-coral)';
    p1.textContent = 'データの読み込みに失敗しました';
    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size: 11px; margin-top: 8px; color: var(--muted);';
    p2.textContent = err.message;
    inner.appendChild(p1);
    inner.appendChild(p2);
  }
});
