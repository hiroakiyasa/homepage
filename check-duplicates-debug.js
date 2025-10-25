const geolib = require('geolib');

// 中津 instances
const nakatsu = [
  { name: "中津 (Osaka 1)", lat: 34.7110401, lng: 135.4968309 },
  { name: "中津 (Osaka 2)", lat: 34.7099152, lng: 135.4923765 },
  { name: "中津 (Oita 1)", lat: 33.5991951, lng: 131.1908891 },
  { name: "中津 (Oita 2)", lat: 33.579340077250265, lng: 131.1857420482234 }
];

console.log('=== 中津 distance check ===\n');

for (let i = 0; i < nakatsu.length; i++) {
  for (let j = i + 1; j < nakatsu.length; j++) {
    const distance = geolib.getDistance(
      { latitude: nakatsu[i].lat, longitude: nakatsu[i].lng },
      { latitude: nakatsu[j].lat, longitude: nakatsu[j].lng }
    );

    const should_merge = distance <= 200 ? '✗ DUPLICATE' : '✓ OK';
    console.log(`${nakatsu[i].name} <-> ${nakatsu[j].name}: ${distance}m ${should_merge}`);
  }
}
