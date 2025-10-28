const fs = require('fs');
const path = require('path');

const regionsDir = './camping_note/regions-new';

// Get all HTML files
const files = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} HTML files to process`);

let successCount = 0;
let errorCount = 0;

files.forEach((file, index) => {
  try {
    const filePath = path.join(regionsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace navigation text
    content = content.replace(
      /← 全国の車中泊スポットマップに戻る/g,
      '← トップに戻る'
    );

    // 2. Remove "重要なお知らせ" section from after hero (if it exists)
    const noticePattern = /<!-- 注意喚起 -->\s*<div style="background: #fff3cd; border: 1px solid #ffc107[^>]*>[\s\S]*?<\/div>/;
    const noticeMatch = content.match(noticePattern);
    if (noticeMatch) {
      content = content.replace(noticePattern, '');
    }

    // 3. Check if footer already exists
    const hasFooter = content.includes('<!-- フッター -->');
    const hasNoticeAtBottom = content.includes('<!-- 重要なお知らせ -->') &&
                               content.lastIndexOf('<!-- 重要なお知らせ -->') > content.length - 2000;

    if (!hasFooter || !hasNoticeAtBottom) {
      // Find the position before </body>
      const bodyCloseIndex = content.lastIndexOf('</body>');
      if (bodyCloseIndex !== -1) {
        const newSections = `
    <!-- 重要なお知らせ -->
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 30px 20px; color: #856404;">
      <strong style="font-size: 1.1em;">⚠️ 重要なお知らせ</strong>
      <ul style="margin: 15px 0 0 20px; line-height: 1.8;">
        <li><strong>駐車料金は参考情報です：</strong>本サービスで表示される駐車料金は、あくまで参考情報であり、実際の料金と異なる場合があります。</li>
        <li><strong>最新情報の確認：</strong>ご利用前に必ず現地または公式サイトで最新の料金、営業時間、利用条件等をご確認ください。</li>
      </ul>
    </div>

    <!-- フッター -->
    <footer style="margin-top: 40px; padding: 30px 20px; border-top: 2px solid #e0e0e0; background: #f8f9fa; text-align: center; color: #666;">
      <p style="margin: 0 0 10px 0;">© 2025 TrailFusion AI - 車旅コンシェルジュ</p>
      <p style="margin: 0;">
        <a href="../terms.html" style="color: #1976d2; text-decoration: none; margin: 0 10px;">利用規約</a> |
        <a href="../privacy.html" style="color: #1976d2; text-decoration: none; margin: 0 10px;">プライバシーポリシー</a> |
        <a href="https://trailfusionai.com" target="_blank" rel="noopener" style="color: #1976d2; text-decoration: none; margin: 0 10px;">TrailFusion AI</a>
      </p>
    </footer>

`;
        content = content.slice(0, bodyCloseIndex) + newSections + content.slice(bodyCloseIndex);
      }
    }

    // Write back the file
    fs.writeFileSync(filePath, content, 'utf8');
    successCount++;

    if ((index + 1) % 100 === 0) {
      console.log(`Processed ${index + 1}/${files.length} files...`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\nComplete!`);
console.log(`Success: ${successCount} files`);
console.log(`Errors: ${errorCount} files`);
