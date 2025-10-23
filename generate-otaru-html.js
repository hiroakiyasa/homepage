const fs = require('fs');
const path = require('path');

// データを読み込む
const dataPath = path.join(__dirname, 'data', 'otaru-parking-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// WordPress記事用HTMLを生成
function generateWordPressHTML() {
  const { event, parkingSpots } = data;

  let html = `
<div class="wp-block-group alignfull has-bg-color has-fg-background-color has-text-color has-background has-global-padding is-layout-constrained wp-container-core-group-is-layout-f611be13 wp-block-group-is-layout-constrained" style="border-radius:12px;padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px;">
    <h2 style="margin: 0; font-size: 18px; font-weight: bold;">🎉 ${event.name}とは</h2>
    <div style="display: flex; gap: 6px; flex-shrink: 0;">
      <a href="https://www.google.com/maps?q=${event.lat},${event.lon}" target="_blank" style="background: #3B82F6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-size: 11px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">🗺️ Maps</a>
      <a href="https://www.google.com/search?q=${encodeURIComponent(event.name)}" target="_blank" style="background: #22D3EE; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-size: 11px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">🔍 検索</a>
    </div>
  </div>

<p class="has-sm-font-size">📅 <strong>開催時期:</strong> 2026年2月上旬</p>
<p class="has-sm-font-size">小樽運河や歴史的建造物をろうそくの灯りで彩る冬の風物詩</p>
</div>

<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide is-style-wide--1"/>

<div class="wp-block-group alignfull has-global-padding is-layout-constrained wp-block-group-is-layout-constrained">
<h2 class="wp-block-heading has-text-align-center has-xl-font-size" style="margin-top:var(--wp--preset--spacing--60);margin-bottom:var(--wp--preset--spacing--50)">🚗 車中泊におすすめの駐車場トップ10</h2>

<style>
  .parking-map-fullwidth { width: 100%; max-width: 100%; background: #f8f9fa; }
  .map-layout-container { display: flex; gap: 0; width: 100%; }
  .map-layout-left { flex: 0 0 70%; min-width: 0; height: 700px; }
  .map-layout-right { flex: 0 0 30%; min-width: 0; max-height: 700px; overflow-y: auto; background: white; padding: 20px; }
  .map-layout-left iframe { width: 100%; height: 100%; border: none; display: block; }
  @media (max-width: 1200px) {
    .map-layout-container { flex-direction: column; min-height: auto; }
    .map-layout-left { flex: 0 0 100%; height: 500px; }
    .map-layout-right { flex: 0 0 100%; max-height: none; }
  }
  @media (max-width: 768px) {
    .map-layout-left { height: 400px; }
  }
</style>
<div class="parking-map-fullwidth">
  <div class="map-layout-container">
    <div class="map-layout-left">
      <iframe id="parking-map-iframe" src="http://camping-note.local/parking-map.html"></iframe>
    </div>
    <div class="map-layout-right">
      <h4 style="margin: 0 0 15px 0;">📍 クリックして地図に表示</h4>
      <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="document.getElementById('parking-map-iframe').contentWindow.showMarker('festival')">
        <strong style="color: #d32f2f;">🔴 会場:${event.name}</strong>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lon}" target="_blank" onclick="event.stopPropagation()" style="background: #667eea; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center;">🗺️</a>
      </div>
`;

  // 駐車場リスト生成
  parkingSpots.forEach((spot, index) => {
    const feeText = spot.overnight_fee === 0 ? '無料' : `¥${spot.overnight_fee.toLocaleString()}`;
    const facilities = [];

    // 周辺施設（300m以内）
    if (spot.facilities.convenience_stores && spot.facilities.convenience_stores.length > 0) {
      const conv = spot.facilities.convenience_stores[0];
      facilities.push(`
            <div onclick="event.stopPropagation(); document.getElementById('parking-map-iframe').contentWindow.showMarker('convenience_${index}')\" style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <img decoding="async" src="http://camping-note.local/logos/${getConvenienceLogo(conv.sub_type)}" style="width: 20px; height: 20px; object-fit: contain;" alt="${conv.name}">
              <span>${conv.name} (${conv.distance}m)</span>
            </div>`);
    }

    if (spot.facilities.toilets && spot.facilities.toilets.length > 0) {
      const toilet = spot.facilities.toilets[0];
      facilities.push(`<div onclick="event.stopPropagation(); document.getElementById('parking-map-iframe').contentWindow.showMarker('toilet_${index}')" style="cursor: pointer;">🚻 ${toilet.name} (${toilet.distance}m)</div>`);
    }

    if (spot.facilities.hot_springs && spot.facilities.hot_springs.length > 0) {
      const onsen = spot.facilities.hot_springs[0];
      facilities.push(`<div onclick="event.stopPropagation(); document.getElementById('parking-map-iframe').contentWindow.showMarker('onsen_${index}')" style="cursor: pointer;">♨️ ${onsen.name} (${(onsen.distance / 1000).toFixed(1)}km)</div>`);
    }

    html += `
<div style="background: #e3f2fd; padding: 10px; border-radius: 6px; margin-bottom: 8px; cursor: pointer;" onclick="document.getElementById('parking-map-iframe').contentWindow.showMarker('parking_${index}')">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="color: #1976d2; font-size: 13px;">🔵 駐車場${index + 1}:${spot.name}</strong>
          <div style="display: flex; gap: 4px;">
            <a href="https://www.google.com/maps?q=${spot.lat},${spot.lng}" target="_blank" onclick="event.stopPropagation()" style="background: #3B82F6; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center;">🗺️</a>
            <a href="https://www.google.com/search?q=${encodeURIComponent(spot.name)}" target="_blank" onclick="event.stopPropagation()" style="background: #22D3EE; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center;">🔍</a>
          </div>
        </div>

        <div style="display: flex; gap: 10px; font-size: 12px; align-items: flex-start;">
          <div style="display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;">
            <div style="color: #666;">📍 徒歩約${spot.walking_minutes}分</div>
            <div style="color: #d32f2f; font-weight: bold;">💰 18:00〜8:00 ${feeText}</div>
          </div>

          ${facilities.length > 0 ? `<div style="color: #666; flex-shrink: 0;">|</div>
          <div style="color: #555; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
            ${facilities.join('')}</div>` : ''}

        </div>
      </div>
`;
  });

  html += `
    </div>
  </div>
</div>
<script>
function scrollToMap(markerKey) {
  const mapContainer = document.getElementById('parking-map-iframe');
  if (mapContainer) {
    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => mapContainer.contentWindow.showMarker(markerKey), 500);
  }
}
</script>
</div>

<div class="wp-block-group alignfull has-global-padding is-layout-constrained wp-block-group-is-layout-constrained"></div>

<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide is-style-wide--2"/>

<div class="wp-block-cover alignfull" style="min-height:400px;aspect-ratio:unset;"><img loading="lazy" decoding="async" width="640" height="426" class="wp-block-cover__image-background wp-image-61" alt="" src="http://camping-note.local/wp-content/uploads/2025/10/yuki-akari-1.jpg" data-object-fit="cover" srcset="http://camping-note.local/wp-content/uploads/2025/10/yuki-akari-1.jpg 640w, http://camping-note.local/wp-content/uploads/2025/10/yuki-akari-1-300x200.jpg 300w" sizes="auto, (max-width: 640px) 100vw, 640px" /><span aria-hidden="true" class="wp-block-cover__background has-bg-background-color has-background-dim-90 has-background-dim"></span><div class="wp-block-cover__inner-container is-layout-flow wp-block-cover-is-layout-flow">
<h2 class="wp-block-heading has-text-align-center has-fg-color has-text-color has-xl-font-size">✨ まとめ</h2>

<p class="has-text-align-center has-fg-color has-text-color has-md-font-size"><strong>小樽雪あかりの路は冬の小樽を代表する美しいイベントです。車中泊を活用すれば、宿泊費を抑えながらゆっくりとお祭りを楽しむことができます。安全に気をつけて、素敵な思い出を作ってください!</strong></p>

<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-a89b3969 wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link has-bg-color has-fg-background-color has-text-color has-background wp-element-button" href="http://camping-note.local/">他のお祭りを見る</a></div>
</div>
</div></div>
`;

  return html;
}

// コンビニロゴ取得
function getConvenienceLogo(subType) {
  const logos = {
    'セブン-イレブン': 'seveneleven.png',
    'ローソン': 'LAWSON.png',
    'セイコーマート': 'seic omart.png',
    'ファミリーマート': 'familymart.png'
  };
  return logos[subType] || 'convenience.png';
}

// HTMLを保存
const html = generateWordPressHTML();
const outputPath = path.join(__dirname, 'data', 'otaru-wordpress.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`✅ WordPress用HTMLを生成しました: ${outputPath}`);
console.log(`文字数: ${html.length}`);
