const fs = require('fs');
const path = require('path');

// 修正するディレクトリ
const dirs = [
  path.join(__dirname, 'camping_note/regions'),
  path.join(__dirname, 'camping_note/regions-new'),
  path.join(__dirname, 'data/regions'),
  path.join(__dirname, 'data/regions-new')
];

// 古いコード
const oldCode = `redirectTo: window.location.href`;

// 新しいコード (本番環境を優先)
const newCode = `redirectTo: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:8000' + window.location.pathname
            : 'https://trailfusionai.com/camping_note' + window.location.pathname.replace(/.*camping_note/, '')`;

let totalFixed = 0;
let totalFiles = 0;

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`⏭️  スキップ: ${dir} (存在しません)`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  console.log(`\n📁 ${path.basename(dir)}: ${files.length}ファイル`);
  totalFiles += files.length;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(oldCode)) {
      content = content.replace(new RegExp(oldCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newCode);
      fs.writeFileSync(filePath, content);
      totalFixed++;

      if (totalFixed % 100 === 0) {
        console.log(`   進捗: ${totalFixed}ファイル修正完了...`);
      }
    }
  });
});

console.log(`\n✅ 合計 ${totalFixed}/${totalFiles}ファイルを修正しました`);
