class ArticleGenerator {
  generateArticle(spot, imageUrl) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // Create title
    const title = this.generateTitle(spot);

    // Create content
    const content = this.generateContent(spot, imageUrl, dateStr);

    return {
      title,
      content,
      tags: this.generateTags(spot)
    };
  }

  generateTitle(spot) {
    const templates = [
      `【車中泊おすすめ】${spot.name}完全ガイド - ${spot.prefecture}の隠れた名スポット`,
      `${spot.prefecture}車中泊スポット紹介：${spot.name}の魅力と周辺施設情報`,
      `今日のおすすめ車中泊スポット「${spot.name}」- 温泉・トイレ・コンビニ情報付き`,
      `【${spot.area_name || spot.prefecture}エリア】${spot.name}で快適車中泊！設備・アクセス完全解説`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateContent(spot, imageUrl, dateStr) {
    let content = '';

    // Header with date
    content += `📅 ${dateStr}の車中泊スポット情報\n\n`;

    // Main image if available
    if (imageUrl) {
      content += `![${spot.name}](${imageUrl})\n\n`;
    }

    // Introduction
    content += `## 🚐 本日のおすすめスポット\n\n`;
    content += `今回ご紹介するのは、${spot.prefecture}${spot.area_name ? spot.area_name + 'の' : 'にある'}「**${spot.name}**」です。\n`;
    content += `このスポットは、車中泊愛好家の間で評価が高く、快適な夜を過ごすための設備が整っています。\n\n`;

    // AI Score if available
    if (spot.score) {
      content += `### 🎯 AIスコア評価: ${(spot.score * 10).toFixed(1)}/100点\n\n`;
      content += this.generateScoreExplanation(spot);
    }

    // Basic Information
    content += `## 📍 基本情報\n\n`;
    content += `- **名称**: ${spot.name}\n`;
    content += `- **住所**: ${spot.address || `${spot.prefecture}${spot.area_name || ''}`}\n`;
    if (spot.lat && spot.lng) {
      content += `- **座標**: [${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}](https://www.google.com/maps?q=${spot.lat},${spot.lng})\n`;
    }
    content += `- **タイプ**: ${spot.type || spot.spot_type || '駐車場'}\n`;

    // Parking Information
    content += `\n## 🅿️ 駐車場情報\n\n`;
    if (spot.original_fees) {
      content += `- **料金**: ${spot.original_fees}\n`;
    } else if (spot.rates) {
      content += `- **料金**: ${this.formatRates(spot.rates)}\n`;
    } else {
      content += `- **料金**: 無料\n`;
    }

    if (spot.capacity || spot.total_spots) {
      content += `- **収容台数**: ${spot.capacity || spot.total_spots}台\n`;
    }

    if (spot.operating_hours || spot.hours) {
      content += `- **営業時間**: ${this.formatHours(spot.operating_hours || spot.hours)}\n`;
    } else {
      content += `- **営業時間**: 24時間\n`;
    }

    if (spot.height_limit) {
      content += `- **高さ制限**: ${spot.height_limit}\n`;
    }

    // Nearby Facilities
    if (spot.nearbyFacilities) {
      content += `\n## 🏪 周辺施設情報\n\n`;
      content += this.generateFacilitiesInfo(spot.nearbyFacilities);
    }

    // Special Features for Hot Springs
    if (spot.nearbyFacilities && spot.nearbyFacilities.hotSprings && spot.nearbyFacilities.hotSprings.length > 0) {
      content += `\n## ♨️ 近隣の温泉施設\n\n`;
      const hotSprings = spot.nearbyFacilities.hotSprings.slice(0, 3);
      hotSprings.forEach((onsen, index) => {
        content += `### ${index + 1}. ${onsen.name} (${this.formatDistance(onsen.distance)})\n`;
        if (onsen.price_info) {
          content += `- 料金: ${onsen.price_info}\n`;
        }
        if (onsen.operating_hours) {
          content += `- 営業時間: ${onsen.operating_hours}\n`;
        }
        content += '\n';
      });
    }

    // Nearby Events/Festivals
    if (spot.nearbyFacilities && spot.nearbyFacilities.festivals && spot.nearbyFacilities.festivals.length > 0) {
      content += `\n## 🎪 近隣のイベント・お祭り\n\n`;
      const festivals = spot.nearbyFacilities.festivals.slice(0, 2);
      festivals.forEach(festival => {
        content += `- **${festival.name}**\n`;
        if (festival.date_info) {
          content += `  - 開催時期: ${festival.date_info}\n`;
        }
        content += `  - 距離: ${this.formatDistance(festival.distance)}\n\n`;
      });
    }

    // Tips and Recommendations
    content += `\n## 💡 車中泊のポイント\n\n`;
    content += this.generateTips(spot);

    // Footer
    content += `\n---\n\n`;
    content += `### 🔍 このスポットの総合評価\n\n`;
    content += this.generateSummary(spot);

    content += `\n\n---\n`;
    content += `*このレポートは、複数のデータソースから収集した情報を基にAIが分析・生成しています。`;
    content += `実際の利用時は最新情報をご確認ください。*\n\n`;
    content += `#車中泊 #${spot.prefecture} #キャンピングカー #道の駅 #温泉`;

    return content;
  }

  generateScoreExplanation(spot) {
    let explanation = '';

    if (spot.nearbyFacilities) {
      const { toilets, convenienceStores, hotSprings } = spot.nearbyFacilities;

      if (toilets && toilets.length > 0) {
        explanation += `- ✅ トイレまで${this.formatDistance(toilets[0].distance)}\n`;
      }
      if (convenienceStores && convenienceStores.length > 0) {
        explanation += `- ✅ コンビニまで${this.formatDistance(convenienceStores[0].distance)}\n`;
      }
      if (hotSprings && hotSprings.length > 0) {
        explanation += `- ✅ 温泉まで${this.formatDistance(hotSprings[0].distance)}\n`;
      }
    }

    if (!spot.original_fees || spot.original_fees === '無料') {
      explanation += `- ✅ 駐車料金無料\n`;
    }

    explanation += '\n';
    return explanation;
  }

  generateFacilitiesInfo(facilities) {
    let info = '';

    // Toilets
    if (facilities.toilets && facilities.toilets.length > 0) {
      const nearest = facilities.toilets[0];
      info += `### 🚻 トイレ\n`;
      info += `- 最寄り: **${nearest.name}** (${this.formatDistance(nearest.distance)})\n\n`;
    } else {
      info += `### 🚻 トイレ\n`;
      info += `- 周辺5km以内に公共トイレなし\n\n`;
    }

    // Convenience Stores
    if (facilities.convenienceStores && facilities.convenienceStores.length > 0) {
      const nearest = facilities.convenienceStores[0];
      info += `### 🏪 コンビニ\n`;
      info += `- 最寄り: **${nearest.name}** (${this.formatDistance(nearest.distance)})\n`;
      if (nearest.brand) {
        info += `- ブランド: ${nearest.brand}\n`;
      }
      info += '\n';
    } else {
      info += `### 🏪 コンビニ\n`;
      info += `- 周辺5km以内にコンビニなし\n\n`;
    }

    // Hot Springs
    if (facilities.hotSprings && facilities.hotSprings.length > 0) {
      const nearest = facilities.hotSprings[0];
      info += `### ♨️ 温泉\n`;
      info += `- 最寄り: **${nearest.name}** (${this.formatDistance(nearest.distance)})\n\n`;
    } else {
      info += `### ♨️ 温泉\n`;
      info += `- 周辺5km以内に温泉施設なし\n\n`;
    }

    return info;
  }

  generateTips(spot) {
    const tips = [];

    // Based on facilities
    if (spot.nearbyFacilities) {
      const { toilets, convenienceStores, hotSprings } = spot.nearbyFacilities;

      if (toilets && toilets.length > 0 && toilets[0].distance < 500) {
        tips.push('🚶 トイレが徒歩圏内にあるため、夜間も安心です');
      }

      if (convenienceStores && convenienceStores.length > 0 && convenienceStores[0].distance < 1000) {
        tips.push('🍱 近くにコンビニがあるため、食事や飲み物の調達が便利です');
      }

      if (hotSprings && hotSprings.length > 0 && hotSprings[0].distance < 2000) {
        tips.push('♨️ 温泉が近いため、入浴後すぐに休めます');
      }
    }

    // Based on parking type
    if (!spot.original_fees || spot.original_fees === '無料') {
      tips.push('💰 無料駐車場のため、長期滞在にも適しています');
    }

    if (spot.capacity && spot.capacity > 50) {
      tips.push('🚗 大型駐車場のため、混雑時でも駐車しやすいです');
    }

    // General tips
    tips.push('🌃 周囲の騒音レベルを事前に確認しましょう');
    tips.push('🔋 ポータブル電源の準備をお忘れなく');

    return tips.map(tip => `- ${tip}`).join('\n');
  }

  generateSummary(spot) {
    let summary = '';

    const score = spot.score ? (spot.score * 10).toFixed(1) : 'N/A';
    summary += `このスポットは、総合スコア**${score}/100点**を獲得しました。`;

    if (spot.score >= 7) {
      summary += '特に設備の充実度と利便性の高さが評価されています。';
    } else if (spot.score >= 5) {
      summary += '基本的な設備は整っており、快適な車中泊が期待できます。';
    } else {
      summary += '静かな環境を求める方や、設備よりも自然を重視する方におすすめです。';
    }

    summary += '\n\n';
    summary += '車中泊初心者から上級者まで、幅広い層におすすめできるスポットです。';

    return summary;
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `約${Math.round(meters)}m`;
    } else {
      return `約${(meters / 1000).toFixed(1)}km`;
    }
  }

  formatRates(rates) {
    if (typeof rates === 'string') {
      return rates;
    } else if (typeof rates === 'object' && rates !== null) {
      const entries = Object.entries(rates);
      if (entries.length > 0) {
        return entries.map(([key, value]) => `${key}: ${value}円`).join(', ');
      }
    }
    return '料金情報あり';
  }

  formatHours(hours) {
    if (typeof hours === 'string') {
      return hours;
    } else if (typeof hours === 'object' && hours !== null) {
      const entries = Object.entries(hours);
      if (entries.length > 0) {
        return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
      }
    }
    return '24時間';
  }

  generateTags(spot) {
    const tags = ['車中泊', 'キャンピングカー', '道の駅'];

    if (spot.prefecture) {
      tags.push(spot.prefecture);
    }

    if (spot.area_name) {
      tags.push(spot.area_name);
    }

    if (spot.nearbyFacilities && spot.nearbyFacilities.hotSprings && spot.nearbyFacilities.hotSprings.length > 0) {
      tags.push('温泉');
    }

    if (!spot.original_fees || spot.original_fees === '無料') {
      tags.push('無料駐車場');
    }

    return tags;
  }
}

module.exports = new ArticleGenerator();