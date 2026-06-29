/* Reel Make support & privacy pages — client-side i18n for 15 languages.
   Auto-detects navigator.language, offers a manual switcher (persisted), and
   sets <html lang>/dir (RTL for Arabic). One static URL serves every language. */
(function () {
  const LANGS = [
    ["en", "English"], ["ja", "日本語"], ["zh-Hans", "简体中文"], ["ko", "한국어"],
    ["es", "Español"], ["pt-BR", "Português"], ["fr", "Français"], ["de", "Deutsch"],
    ["it", "Italiano"], ["ru", "Русский"], ["tr", "Türkçe"], ["vi", "Tiếng Việt"],
    ["th", "ไทย"], ["hi", "हिन्दी"], ["ar", "العربية"],
  ];
  const EMAIL = "trailfusionai@gmail.com";
  const UPDATED = "2026-06-30";

  const UI = {
    en: { apps: "Apps", appInfo: "App Info", privacy: "Privacy Policy", support: "Support", terms: "Terms of Service", footer: "© 2025-2026 TrailFusion AI." },
    ja: { apps: "アプリ", appInfo: "アプリ情報", privacy: "プライバシーポリシー", support: "サポート", terms: "利用規約", footer: "© 2025-2026 TrailFusion AI." },
    "zh-Hans": { apps: "应用", appInfo: "应用信息", privacy: "隐私政策", support: "支持", terms: "服务条款", footer: "© 2025-2026 TrailFusion AI." },
    ko: { apps: "앱", appInfo: "앱 정보", privacy: "개인정보처리방침", support: "지원", terms: "이용약관", footer: "© 2025-2026 TrailFusion AI." },
    es: { apps: "Apps", appInfo: "Información", privacy: "Política de privacidad", support: "Soporte", terms: "Términos del servicio", footer: "© 2025-2026 TrailFusion AI." },
    "pt-BR": { apps: "Apps", appInfo: "Sobre o app", privacy: "Política de privacidade", support: "Suporte", terms: "Termos de Serviço", footer: "© 2025-2026 TrailFusion AI." },
    fr: { apps: "Apps", appInfo: "Infos de l'app", privacy: "Confidentialité", support: "Assistance", terms: "Conditions d'utilisation", footer: "© 2025-2026 TrailFusion AI." },
    de: { apps: "Apps", appInfo: "App-Info", privacy: "Datenschutz", support: "Support", terms: "Nutzungsbedingungen", footer: "© 2025-2026 TrailFusion AI." },
    it: { apps: "App", appInfo: "Info app", privacy: "Privacy", support: "Assistenza", terms: "Termini di servizio", footer: "© 2025-2026 TrailFusion AI." },
    ru: { apps: "Приложения", appInfo: "Об app", privacy: "Конфиденциальность", support: "Поддержка", terms: "Условия использования", footer: "© 2025-2026 TrailFusion AI." },
    tr: { apps: "Uygulamalar", appInfo: "Uygulama bilgisi", privacy: "Gizlilik", support: "Destek", terms: "Kullanım Şartları", footer: "© 2025-2026 TrailFusion AI." },
    vi: { apps: "Ứng dụng", appInfo: "Thông tin app", privacy: "Quyền riêng tư", support: "Hỗ trợ", terms: "Điều khoản dịch vụ", footer: "© 2025-2026 TrailFusion AI." },
    th: { apps: "แอป", appInfo: "ข้อมูลแอป", privacy: "ความเป็นส่วนตัว", support: "ฝ่ายสนับสนุน", terms: "ข้อกำหนดการให้บริการ", footer: "© 2025-2026 TrailFusion AI." },
    hi: { apps: "ऐप्स", appInfo: "ऐप जानकारी", privacy: "गोपनीयता नीति", support: "सहायता", terms: "सेवा की शर्तें", footer: "© 2025-2026 TrailFusion AI." },
    ar: { apps: "التطبيقات", appInfo: "معلومات التطبيق", privacy: "سياسة الخصوصية", support: "الدعم", terms: "شروط الخدمة", footer: "© 2025-2026 TrailFusion AI." },
  };

  const SUPPORT = {
    en: { badge: "SUPPORT", h1: "Reel Make Support", intro: "For questions, feedback, or bug reports about Reel Make, please contact us by email. We usually reply within a few business days.", faqTitle: "FAQ", faq: [["How do I make a reel?", "Pick photos/videos, choose a theme & voice, then tap “Create”."], ["Languages", "15 languages with native AI voices."], ["Subscriptions", "Free / Pro / MAX plans. Manage or cancel anytime in your App Store / Google Play account."]] },
    ja: { badge: "サポート", h1: "Reel Make サポート", intro: "アプリの使い方・ご要望・不具合のお問い合わせは、下記メールまでご連絡ください。数営業日以内に返信します。", faqTitle: "よくある質問", faq: [["リールの作り方は？", "写真や動画を選び、テーマと声を選んで「作成」をタップするだけです。"], ["対応言語", "ネイティブAI音声つき15言語に対応しています。"], ["課金について", "Free / Pro / MAX プラン。管理・解約は App Store / Google Play のアカウントからいつでも可能です。"]] },
    "zh-Hans": { badge: "支持", h1: "Reel Make 支持", intro: "如对 Reel Make 有任何问题、建议或故障反馈，请通过下方邮箱联系我们。我们通常在数个工作日内回复。", faqTitle: "常见问题", faq: [["如何制作短视频？", "选择照片/视频，选好主题与配音，点击「制作」即可。"], ["支持的语言", "支持 15 种语言，配有母语级 AI 配音。"], ["订阅", "Free / Pro / MAX 套餐。可随时在 App Store / Google Play 账户中管理或取消。"]] },
    ko: { badge: "지원", h1: "Reel Make 지원", intro: "Reel Make에 대한 질문, 의견, 버그 신고는 아래 이메일로 문의해 주세요. 보통 영업일 기준 며칠 내에 답변드립니다.", faqTitle: "자주 묻는 질문", faq: [["릴은 어떻게 만드나요?", "사진/영상을 고르고 테마와 음성을 선택한 뒤 ‘만들기’를 누르세요."], ["지원 언어", "원어민급 AI 음성과 함께 15개 언어를 지원합니다."], ["구독", "Free / Pro / MAX 요금제. App Store / Google Play 계정에서 언제든 관리·해지할 수 있습니다."]] },
    es: { badge: "SOPORTE", h1: "Soporte de Reel Make", intro: "Para preguntas, comentarios o errores sobre Reel Make, escríbenos por correo. Solemos responder en pocos días hábiles.", faqTitle: "Preguntas frecuentes", faq: [["¿Cómo creo un reel?", "Elige fotos/vídeos, un tema y una voz, y toca “Crear”."], ["Idiomas", "15 idiomas con voces de IA nativas."], ["Suscripciones", "Planes Free / Pro / MAX. Gestiona o cancela cuando quieras en tu cuenta de App Store / Google Play."]] },
    "pt-BR": { badge: "SUPORTE", h1: "Suporte do Reel Make", intro: "Para dúvidas, sugestões ou erros sobre o Reel Make, fale com a gente por e-mail. Costumamos responder em alguns dias úteis.", faqTitle: "Perguntas frequentes", faq: [["Como faço um reel?", "Escolha fotos/vídeos, um tema e uma voz e toque em “Criar”."], ["Idiomas", "15 idiomas com vozes de IA nativas."], ["Assinaturas", "Planos Free / Pro / MAX. Gerencie ou cancele quando quiser na sua conta da App Store / Google Play."]] },
    fr: { badge: "ASSISTANCE", h1: "Assistance Reel Make", intro: "Pour toute question, suggestion ou bug concernant Reel Make, contactez-nous par e-mail. Nous répondons généralement sous quelques jours ouvrés.", faqTitle: "FAQ", faq: [["Comment créer un reel ?", "Choisissez des photos/vidéos, un thème et une voix, puis touchez « Créer »."], ["Langues", "15 langues avec des voix IA natives."], ["Abonnements", "Forfaits Free / Pro / MAX. Gérez ou résiliez à tout moment depuis votre compte App Store / Google Play."]] },
    de: { badge: "SUPPORT", h1: "Reel Make Support", intro: "Bei Fragen, Feedback oder Fehlern zu Reel Make schreib uns bitte eine E-Mail. Wir antworten meist innerhalb weniger Werktage.", faqTitle: "FAQ", faq: [["Wie erstelle ich ein Reel?", "Fotos/Videos auswählen, Thema & Stimme wählen, dann auf „Erstellen“ tippen."], ["Sprachen", "15 Sprachen mit muttersprachlichen KI-Stimmen."], ["Abos", "Free / Pro / MAX. Jederzeit im App Store / Google Play-Konto verwalten oder kündigen."]] },
    it: { badge: "ASSISTENZA", h1: "Assistenza Reel Make", intro: "Per domande, suggerimenti o bug su Reel Make, scrivici via e-mail. Di solito rispondiamo entro pochi giorni lavorativi.", faqTitle: "FAQ", faq: [["Come creo un reel?", "Scegli foto/video, un tema e una voce, poi tocca “Crea”."], ["Lingue", "15 lingue con voci IA native."], ["Abbonamenti", "Piani Free / Pro / MAX. Gestisci o annulla quando vuoi dal tuo account App Store / Google Play."]] },
    ru: { badge: "ПОДДЕРЖКА", h1: "Поддержка Reel Make", intro: "По вопросам, предложениям и ошибкам в Reel Make пишите нам на почту. Обычно отвечаем в течение нескольких рабочих дней.", faqTitle: "Частые вопросы", faq: [["Как создать ролик?", "Выберите фото/видео, тему и голос, затем нажмите «Создать»."], ["Языки", "15 языков с нативными ИИ-голосами."], ["Подписки", "Тарифы Free / Pro / MAX. Управляйте или отменяйте в любой момент в аккаунте App Store / Google Play."]] },
    tr: { badge: "DESTEK", h1: "Reel Make Destek", intro: "Reel Make hakkında soru, geri bildirim veya hata bildirimi için bize e-posta gönderin. Genellikle birkaç iş günü içinde yanıtlıyoruz.", faqTitle: "SSS", faq: [["Reel nasıl oluşturulur?", "Fotoğraf/video seçin, tema ve ses seçip “Oluştur”a dokunun."], ["Diller", "Yerel AI sesleriyle 15 dil."], ["Abonelikler", "Free / Pro / MAX planları. App Store / Google Play hesabınızdan istediğiniz zaman yönetin veya iptal edin."]] },
    vi: { badge: "HỖ TRỢ", h1: "Hỗ trợ Reel Make", intro: "Mọi câu hỏi, góp ý hoặc báo lỗi về Reel Make, hãy liên hệ qua email. Chúng tôi thường phản hồi trong vài ngày làm việc.", faqTitle: "Câu hỏi thường gặp", faq: [["Làm reel thế nào?", "Chọn ảnh/video, chọn chủ đề và giọng đọc, rồi chạm “Tạo”."], ["Ngôn ngữ", "15 ngôn ngữ với giọng AI bản ngữ."], ["Gói đăng ký", "Gói Free / Pro / MAX. Quản lý hoặc hủy bất cứ lúc nào trong tài khoản App Store / Google Play."]] },
    th: { badge: "ฝ่ายสนับสนุน", h1: "ฝ่ายสนับสนุน Reel Make", intro: "หากมีคำถาม ข้อเสนอแนะ หรือพบข้อผิดพลาดเกี่ยวกับ Reel Make โปรดติดต่อเราทางอีเมล เรามักตอบกลับภายในไม่กี่วันทำการ", faqTitle: "คำถามที่พบบ่อย", faq: [["สร้างรีลอย่างไร?", "เลือกรูป/วิดีโอ เลือกธีมและเสียง แล้วแตะ “สร้าง”"], ["ภาษา", "รองรับ 15 ภาษา พร้อมเสียง AI เจ้าของภาษา"], ["การสมัครสมาชิก", "แพ็กเกจ Free / Pro / MAX จัดการหรือยกเลิกได้ทุกเมื่อในบัญชี App Store / Google Play"]] },
    hi: { badge: "सहायता", h1: "Reel Make सहायता", intro: "Reel Make से जुड़े सवाल, सुझाव या बग की रिपोर्ट के लिए हमें ईमेल करें। हम आमतौर पर कुछ कार्यदिवसों में जवाब देते हैं।", faqTitle: "अक्सर पूछे जाने वाले सवाल", faq: [["रील कैसे बनाएं?", "फ़ोटो/वीडियो चुनें, थीम और आवाज़ चुनें, फिर “बनाएं” दबाएं।"], ["भाषाएं", "नेटिव AI आवाज़ों के साथ 15 भाषाएं।"], ["सदस्यता", "Free / Pro / MAX प्लान। App Store / Google Play खाते में कभी भी प्रबंधित या रद्द करें।"]] },
    ar: { badge: "الدعم", h1: "دعم Reel Make", intro: "للأسئلة أو الملاحظات أو الإبلاغ عن الأخطاء حول Reel Make، يُرجى التواصل معنا عبر البريد الإلكتروني. نرد عادةً خلال أيام عمل قليلة.", faqTitle: "الأسئلة الشائعة", faq: [["كيف أصنع ريلز؟", "اختر صورًا/مقاطع، ثم سمة وصوتًا، واضغط «إنشاء»."], ["اللغات", "15 لغة بأصوات ذكاء اصطناعي أصلية."], ["الاشتراكات", "خطط Free / Pro / MAX. يمكنك الإدارة أو الإلغاء في أي وقت من حساب App Store / Google Play."]] },
  };

  // privacy: sections = [ [heading, bodyHTML], ... ]. Section 4 body contains a <ul>.
  const PRIVACY = {};
  function P(lang, h1, updatedLabel, intro, secs) { PRIVACY[lang] = { badge: (UI[lang] || UI.en).privacy.toUpperCase(), h1, updatedLabel, intro, sections: secs }; }

  P("en", "Reel Make — Privacy Policy", "Last updated", "This Privacy Policy explains how <b>Reel Make</b> (\"the App\"), operated by TrailFusion AI (\"we\"), handles your information. By using the App you agree to this policy.", [
    ["1. No account required", "<p>The App does not require you to create an account or sign in. We do not collect your name, email, or contact list.</p>"],
    ["2. Photos & videos you select", "<p>To generate a reel, the photos and videos you choose are uploaded to our cloud render service (Cloudflare R2) and processed by AI to compose the video. <b>Uploaded source files and rendered results are automatically deleted within about 7 days</b> and are <b>never used to train AI models</b>. The App only accesses the specific media you select; it does not scan your library.</p>"],
    ["3. Text you enter", "<p>Prompts, themes, captions, and brand text you enter are sent to AI providers to generate the script, narration, and on-screen text for your reel.</p>"],
    ["4. Service providers (sub-processors)", null],
    ["5. Purchases", "<p>Subscriptions (Free / Pro / MAX) and credit packs are processed by Apple App Store or Google Play. We never receive or store your payment-card details. We receive only your subscription status (via RevenueCat) to unlock features. Manage or cancel anytime in your store account.</p>"],
    ["6. Analytics", "<p>We do not sell your data or use it for advertising profiling. Any diagnostics are limited to anonymous, aggregated app-stability information.</p>"],
    ["7. Children", "<p>The App is not directed to children under the age required by your local app store. We do not knowingly collect personal information from children.</p>"],
    ["8. Your choices & rights", "<p>Because uploads auto-delete and we keep no account, there is little personal data to manage. For any request or question, contact <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Changes", "<p>We may update this policy; the \"Last updated\" date will change accordingly.</p>"],
  ]);
  P("ja", "Reel Make — プライバシーポリシー", "最終更新日", "本ポリシーは、TrailFusion AI が提供する <b>Reel Make</b>（以下「本アプリ」）における情報の取り扱いを説明します。本アプリの利用をもって本ポリシーに同意したものとみなします。", [
    ["1. アカウント不要", "<p>本アプリの利用にアカウント登録やログインは不要です。氏名・メールアドレス・連絡先などは収集しません。</p>"],
    ["2. 選択した写真・動画", "<p>リール生成のため、選択した写真・動画はクラウドのレンダリングサービス（Cloudflare R2）にアップロードされ、AIが動画を構成します。<b>アップロード素材および生成結果は約7日以内に自動削除</b>され、<b>AIの学習には一切使用しません</b>。本アプリはあなたが選択した素材のみにアクセスし、ライブラリ全体をスキャンすることはありません。</p>"],
    ["3. 入力したテキスト", "<p>プロンプト・テーマ・字幕・ブランド名などの入力内容は、台本・ナレーション・画面テキストの生成のためAI提供者に送信されます。</p>"],
    ["4. 利用する外部サービス", null],
    ["5. 課金", "<p>サブスク（Free / Pro / MAX）およびクレジットは App Store / Google Play が処理します。カード情報を当方が受け取る・保存することはありません。機能解放のため購読状態（RevenueCat経由）のみを受け取ります。管理・解約は各ストアのアカウントからいつでも可能です。</p>"],
    ["6. 解析・広告", "<p>データの販売や広告プロファイリングは行いません。診断情報は匿名・集計されたアプリ安定性の範囲に限られます。</p>"],
    ["7. お子さまの利用", "<p>本アプリは各ストアの定める年齢未満のお子さまを対象としていません。お子さまの個人情報を意図的に収集することはありません。</p>"],
    ["8. お問い合わせ・権利", "<p>アップロードは自動削除され、アカウントも保持しないため、管理すべき個人データはほとんどありません。ご要望・ご質問は <a class=\"rm-mail\">EMAIL</a> まで。</p>"],
    ["9. 改定", "<p>本ポリシーは改定されることがあり、その場合「最終更新日」を更新します。</p>"],
  ]);
  P("zh-Hans", "Reel Make — 隐私政策", "最后更新", "本隐私政策说明由 TrailFusion AI 运营的 <b>Reel Make</b>（“本应用”）如何处理您的信息。使用本应用即表示您同意本政策。", [
    ["1. 无需账户", "<p>本应用无需注册或登录。我们不收集您的姓名、邮箱或通讯录。</p>"],
    ["2. 您选择的照片和视频", "<p>为生成短视频，您选择的照片和视频会上传到我们的云渲染服务（Cloudflare R2）并由 AI 合成视频。<b>上传素材及生成结果约 7 天内自动删除</b>，且<b>绝不用于训练 AI 模型</b>。本应用仅访问您选择的素材，不会扫描整个相册。</p>"],
    ["3. 您输入的文本", "<p>您输入的提示词、主题、字幕和品牌文字会发送给 AI 提供商，用于生成脚本、配音和画面文字。</p>"],
    ["4. 服务提供商（子处理方）", null],
    ["5. 购买", "<p>订阅（Free / Pro / MAX）和积分包由 Apple App Store 或 Google Play 处理。我们不接收或存储您的银行卡信息，仅通过 RevenueCat 接收订阅状态以解锁功能。可随时在商店账户中管理或取消。</p>"],
    ["6. 分析与广告", "<p>我们不出售您的数据，也不用于广告画像。任何诊断信息仅限匿名、汇总的应用稳定性数据。</p>"],
    ["7. 儿童", "<p>本应用不面向低于当地应用商店规定年龄的儿童。我们不会有意收集儿童的个人信息。</p>"],
    ["8. 您的选择与权利", "<p>由于上传内容自动删除且不保留账户，几乎没有需要管理的个人数据。如有请求或疑问，请联系 <a class=\"rm-mail\">EMAIL</a>。</p>"],
    ["9. 变更", "<p>我们可能更新本政策，并相应更新“最后更新”日期。</p>"],
  ]);
  P("ko", "Reel Make — 개인정보처리방침", "최종 업데이트", "본 방침은 TrailFusion AI가 운영하는 <b>Reel Make</b>(\"본 앱\")가 정보를 처리하는 방식을 설명합니다. 본 앱을 사용하면 본 방침에 동의한 것으로 간주됩니다.", [
    ["1. 계정 불필요", "<p>본 앱은 가입이나 로그인이 필요 없습니다. 이름, 이메일, 연락처를 수집하지 않습니다.</p>"],
    ["2. 선택한 사진·영상", "<p>릴 생성을 위해 선택한 사진·영상은 클라우드 렌더링 서비스(Cloudflare R2)에 업로드되어 AI가 영상을 구성합니다. <b>업로드 소재와 생성 결과는 약 7일 이내 자동 삭제</b>되며 <b>AI 학습에 절대 사용되지 않습니다</b>. 본 앱은 선택한 소재에만 접근하며 라이브러리 전체를 스캔하지 않습니다.</p>"],
    ["3. 입력한 텍스트", "<p>입력한 프롬프트·테마·자막·브랜드 텍스트는 대본, 내레이션, 화면 텍스트 생성을 위해 AI 제공업체로 전송됩니다.</p>"],
    ["4. 서비스 제공업체(수탁사)", null],
    ["5. 결제", "<p>구독(Free / Pro / MAX)과 크레딧은 Apple App Store 또는 Google Play가 처리합니다. 카드 정보를 받거나 저장하지 않으며, 기능 해제를 위해 구독 상태(RevenueCat 경유)만 받습니다. 스토어 계정에서 언제든 관리·해지할 수 있습니다.</p>"],
    ["6. 분석·광고", "<p>데이터를 판매하거나 광고 프로파일링에 사용하지 않습니다. 진단 정보는 익명·집계된 앱 안정성 정보로 제한됩니다.</p>"],
    ["7. 아동", "<p>본 앱은 현지 앱스토어가 정한 연령 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 고의로 수집하지 않습니다.</p>"],
    ["8. 선택권과 권리", "<p>업로드가 자동 삭제되고 계정을 보관하지 않으므로 관리할 개인정보가 거의 없습니다. 요청이나 문의는 <a class=\"rm-mail\">EMAIL</a>로 연락 주세요.</p>"],
    ["9. 변경", "<p>본 방침은 변경될 수 있으며 그에 따라 \"최종 업데이트\" 날짜가 바뀝니다.</p>"],
  ]);
  P("es", "Reel Make — Política de privacidad", "Última actualización", "Esta Política explica cómo <b>Reel Make</b> (\"la App\"), operada por TrailFusion AI (\"nosotros\"), trata tu información. Al usar la App aceptas esta política.", [
    ["1. Sin cuenta", "<p>La App no requiere crear una cuenta ni iniciar sesión. No recopilamos tu nombre, correo ni contactos.</p>"],
    ["2. Fotos y vídeos que eliges", "<p>Para generar un reel, las fotos y vídeos que eliges se suben a nuestro servicio de renderizado en la nube (Cloudflare R2) y los procesa la IA. <b>Los archivos subidos y los resultados se eliminan automáticamente en unos 7 días</b> y <b>nunca se usan para entrenar modelos de IA</b>. La App solo accede al contenido que seleccionas; no escanea tu galería.</p>"],
    ["3. Texto que introduces", "<p>Las indicaciones, temas, subtítulos y texto de marca que introduces se envían a proveedores de IA para generar el guion, la narración y el texto en pantalla.</p>"],
    ["4. Proveedores de servicios", null],
    ["5. Compras", "<p>Las suscripciones (Free / Pro / MAX) y los créditos los procesan Apple App Store o Google Play. Nunca recibimos ni almacenamos los datos de tu tarjeta; solo recibimos tu estado de suscripción (vía RevenueCat) para desbloquear funciones. Gestiona o cancela cuando quieras en tu cuenta.</p>"],
    ["6. Analítica", "<p>No vendemos tus datos ni los usamos para perfiles publicitarios. Cualquier diagnóstico se limita a información anónima y agregada de estabilidad.</p>"],
    ["7. Menores", "<p>La App no está dirigida a menores de la edad requerida por tu tienda. No recopilamos a sabiendas datos de menores.</p>"],
    ["8. Tus opciones y derechos", "<p>Como las subidas se autoeliminan y no guardamos cuenta, hay pocos datos personales que gestionar. Para cualquier solicitud, escribe a <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Cambios", "<p>Podemos actualizar esta política; la fecha de \"Última actualización\" cambiará en consecuencia.</p>"],
  ]);
  P("pt-BR", "Reel Make — Política de Privacidade", "Última atualização", "Esta Política explica como o <b>Reel Make</b> (\"o App\"), operado pela TrailFusion AI (\"nós\"), trata suas informações. Ao usar o App, você concorda com esta política.", [
    ["1. Sem conta", "<p>O App não exige criar conta nem login. Não coletamos seu nome, e-mail ou contatos.</p>"],
    ["2. Fotos e vídeos que você escolhe", "<p>Para gerar um reel, as fotos e vídeos escolhidos são enviados ao nosso serviço de renderização em nuvem (Cloudflare R2) e processados por IA. <b>Os arquivos enviados e os resultados são excluídos automaticamente em cerca de 7 dias</b> e <b>nunca são usados para treinar modelos de IA</b>. O App acessa apenas a mídia que você seleciona; não varre sua galeria.</p>"],
    ["3. Texto que você digita", "<p>Os comandos, temas, legendas e texto de marca que você digita são enviados a provedores de IA para gerar o roteiro, a narração e o texto na tela.</p>"],
    ["4. Provedores de serviço", null],
    ["5. Compras", "<p>Assinaturas (Free / Pro / MAX) e créditos são processados pela Apple App Store ou Google Play. Nunca recebemos nem armazenamos os dados do seu cartão; recebemos apenas seu status de assinatura (via RevenueCat) para liberar recursos. Gerencie ou cancele quando quiser na sua conta.</p>"],
    ["6. Análises", "<p>Não vendemos seus dados nem os usamos para perfis de publicidade. Diagnósticos se limitam a informações anônimas e agregadas de estabilidade.</p>"],
    ["7. Crianças", "<p>O App não é direcionado a crianças abaixo da idade exigida pela sua loja. Não coletamos intencionalmente dados de crianças.</p>"],
    ["8. Suas escolhas e direitos", "<p>Como os envios se autoexcluem e não mantemos conta, há poucos dados pessoais a gerenciar. Para qualquer solicitação, escreva para <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Alterações", "<p>Podemos atualizar esta política; a data de \"Última atualização\" mudará conforme necessário.</p>"],
  ]);
  P("fr", "Reel Make — Politique de confidentialité", "Dernière mise à jour", "Cette politique explique comment <b>Reel Make</b> (« l'App »), exploitée par TrailFusion AI (« nous »), traite vos informations. En utilisant l'App, vous acceptez cette politique.", [
    ["1. Aucun compte requis", "<p>L'App ne nécessite ni compte ni connexion. Nous ne collectons pas votre nom, e-mail ni contacts.</p>"],
    ["2. Photos et vidéos que vous choisissez", "<p>Pour générer un reel, les photos et vidéos choisies sont envoyées à notre service de rendu cloud (Cloudflare R2) et traitées par l'IA. <b>Les fichiers envoyés et les résultats sont supprimés automatiquement sous environ 7 jours</b> et <b>ne servent jamais à entraîner des modèles d'IA</b>. L'App n'accède qu'aux médias que vous sélectionnez ; elle ne scanne pas votre galerie.</p>"],
    ["3. Texte que vous saisissez", "<p>Les invites, thèmes, sous-titres et textes de marque que vous saisissez sont envoyés à des fournisseurs d'IA pour générer le script, la voix off et le texte à l'écran.</p>"],
    ["4. Prestataires de services", null],
    ["5. Achats", "<p>Les abonnements (Free / Pro / MAX) et les crédits sont traités par l'App Store d'Apple ou Google Play. Nous ne recevons ni ne stockons vos données de carte ; nous recevons seulement votre statut d'abonnement (via RevenueCat) pour débloquer les fonctions. Gérez ou résiliez à tout moment dans votre compte.</p>"],
    ["6. Analytique", "<p>Nous ne vendons pas vos données et ne les utilisons pas à des fins de profilage publicitaire. Tout diagnostic se limite à des informations anonymes et agrégées de stabilité.</p>"],
    ["7. Enfants", "<p>L'App ne s'adresse pas aux enfants sous l'âge requis par votre boutique. Nous ne collectons pas sciemment de données d'enfants.</p>"],
    ["8. Vos choix et droits", "<p>Comme les envois s'auto-suppriment et que nous ne gardons aucun compte, il y a peu de données à gérer. Pour toute demande, écrivez à <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Modifications", "<p>Nous pouvons mettre à jour cette politique ; la date de « Dernière mise à jour » changera en conséquence.</p>"],
  ]);
  P("de", "Reel Make — Datenschutzerklärung", "Zuletzt aktualisiert", "Diese Erklärung beschreibt, wie <b>Reel Make</b> („die App\"), betrieben von TrailFusion AI („wir\"), mit deinen Informationen umgeht. Mit der Nutzung stimmst du dieser Erklärung zu.", [
    ["1. Kein Konto nötig", "<p>Die App erfordert weder Konto noch Anmeldung. Wir erfassen weder Name, E-Mail noch Kontakte.</p>"],
    ["2. Von dir gewählte Fotos & Videos", "<p>Zur Reel-Erstellung werden die gewählten Fotos und Videos an unseren Cloud-Render-Dienst (Cloudflare R2) hochgeladen und per KI verarbeitet. <b>Hochgeladene Dateien und Ergebnisse werden in etwa 7 Tagen automatisch gelöscht</b> und <b>nie zum Training von KI-Modellen verwendet</b>. Die App greift nur auf die ausgewählten Medien zu und scannt deine Galerie nicht.</p>"],
    ["3. Von dir eingegebener Text", "<p>Eingaben, Themen, Untertitel und Markentexte werden an KI-Anbieter gesendet, um Skript, Sprecher und Bildschirmtext zu erzeugen.</p>"],
    ["4. Dienstleister (Auftragsverarbeiter)", null],
    ["5. Käufe", "<p>Abos (Free / Pro / MAX) und Credits werden über Apple App Store oder Google Play abgewickelt. Wir erhalten und speichern keine Kartendaten; wir erhalten nur deinen Abostatus (über RevenueCat) zur Freischaltung. Verwalten oder kündigen jederzeit im Store-Konto.</p>"],
    ["6. Analyse", "<p>Wir verkaufen deine Daten nicht und nutzen sie nicht für Werbeprofile. Diagnosen beschränken sich auf anonyme, aggregierte Stabilitätsdaten.</p>"],
    ["7. Kinder", "<p>Die App richtet sich nicht an Kinder unter dem von deinem Store geforderten Alter. Wir erfassen wissentlich keine Daten von Kindern.</p>"],
    ["8. Deine Wahlmöglichkeiten & Rechte", "<p>Da Uploads sich selbst löschen und kein Konto besteht, gibt es kaum personenbezogene Daten zu verwalten. Bei Anfragen schreibe an <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Änderungen", "<p>Wir können diese Erklärung aktualisieren; das Datum „Zuletzt aktualisiert\" ändert sich entsprechend.</p>"],
  ]);
  P("it", "Reel Make — Informativa sulla privacy", "Ultimo aggiornamento", "Questa Informativa spiega come <b>Reel Make</b> (\"l'App\"), gestita da TrailFusion AI (\"noi\"), tratta le tue informazioni. Usando l'App accetti questa informativa.", [
    ["1. Nessun account", "<p>L'App non richiede registrazione né accesso. Non raccogliamo nome, e-mail o contatti.</p>"],
    ["2. Foto e video che scegli", "<p>Per generare un reel, le foto e i video scelti vengono caricati sul nostro servizio di rendering cloud (Cloudflare R2) ed elaborati dall'IA. <b>I file caricati e i risultati vengono eliminati automaticamente entro circa 7 giorni</b> e <b>non vengono mai usati per addestrare modelli di IA</b>. L'App accede solo ai media selezionati; non analizza la tua galleria.</p>"],
    ["3. Testo che inserisci", "<p>Prompt, temi, sottotitoli e testo del brand inseriti vengono inviati ai fornitori di IA per generare copione, voce e testo a schermo.</p>"],
    ["4. Fornitori di servizi", null],
    ["5. Acquisti", "<p>Abbonamenti (Free / Pro / MAX) e crediti sono gestiti da Apple App Store o Google Play. Non riceviamo né conserviamo i dati della carta; riceviamo solo lo stato dell'abbonamento (via RevenueCat) per sbloccare le funzioni. Gestisci o annulla quando vuoi dal tuo account.</p>"],
    ["6. Analisi", "<p>Non vendiamo i tuoi dati né li usiamo per profilazione pubblicitaria. Eventuali diagnostiche si limitano a dati anonimi e aggregati di stabilità.</p>"],
    ["7. Minori", "<p>L'App non è rivolta a minori al di sotto dell'età richiesta dal tuo store. Non raccogliamo consapevolmente dati di minori.</p>"],
    ["8. Scelte e diritti", "<p>Poiché i caricamenti si autoeliminano e non conserviamo account, ci sono pochi dati personali da gestire. Per qualsiasi richiesta scrivi a <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Modifiche", "<p>Potremmo aggiornare questa informativa; la data di \"Ultimo aggiornamento\" cambierà di conseguenza.</p>"],
  ]);
  P("ru", "Reel Make — Политика конфиденциальности", "Последнее обновление", "Эта Политика описывает, как <b>Reel Make</b> (\"Приложение\"), управляемое TrailFusion AI (\"мы\"), обрабатывает вашу информацию. Используя Приложение, вы соглашаетесь с Политикой.", [
    ["1. Аккаунт не нужен", "<p>Приложению не требуется регистрация или вход. Мы не собираем имя, e-mail или контакты.</p>"],
    ["2. Выбранные фото и видео", "<p>Для создания ролика выбранные фото и видео загружаются в наш облачный сервис рендеринга (Cloudflare R2) и обрабатываются ИИ. <b>Загруженные файлы и результаты автоматически удаляются примерно за 7 дней</b> и <b>никогда не используются для обучения моделей ИИ</b>. Приложение обращается только к выбранным материалам и не сканирует галерею.</p>"],
    ["3. Вводимый текст", "<p>Введённые подсказки, темы, субтитры и текст бренда отправляются провайдерам ИИ для генерации сценария, озвучки и экранного текста.</p>"],
    ["4. Поставщики услуг", null],
    ["5. Покупки", "<p>Подписки (Free / Pro / MAX) и кредиты обрабатываются Apple App Store или Google Play. Мы не получаем и не храним данные карты; получаем лишь статус подписки (через RevenueCat) для разблокировки функций. Управляйте или отменяйте в любой момент в аккаунте магазина.</p>"],
    ["6. Аналитика", "<p>Мы не продаём ваши данные и не используем их для рекламного профилирования. Диагностика ограничена анонимными агрегированными данными о стабильности.</p>"],
    ["7. Дети", "<p>Приложение не предназначено для детей младше возраста, установленного вашим магазином. Мы сознательно не собираем данные детей.</p>"],
    ["8. Ваши права", "<p>Поскольку загрузки автоудаляются и аккаунт не хранится, персональных данных почти нет. По любым вопросам пишите на <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Изменения", "<p>Мы можем обновлять Политику; дата \"Последнее обновление\" будет меняться соответственно.</p>"],
  ]);
  P("tr", "Reel Make — Gizlilik Politikası", "Son güncelleme", "Bu Politika, TrailFusion AI tarafından işletilen <b>Reel Make</b> (\"Uygulama\") uygulamasının bilgilerinizi nasıl işlediğini açıklar. Uygulamayı kullanarak bu politikayı kabul edersiniz.", [
    ["1. Hesap gerekmez", "<p>Uygulama hesap veya giriş gerektirmez. Adınızı, e-postanızı veya kişilerinizi toplamayız.</p>"],
    ["2. Seçtiğiniz foto ve videolar", "<p>Reel oluşturmak için seçtiğiniz foto ve videolar bulut işleme hizmetimize (Cloudflare R2) yüklenir ve yapay zeka ile işlenir. <b>Yüklenen dosyalar ve sonuçlar yaklaşık 7 gün içinde otomatik silinir</b> ve <b>asla yapay zeka eğitimi için kullanılmaz</b>. Uygulama yalnızca seçtiğiniz medyaya erişir; galerinizi taramaz.</p>"],
    ["3. Girdiğiniz metin", "<p>Girdiğiniz istemler, temalar, altyazılar ve marka metni; senaryo, seslendirme ve ekran metni üretmek için yapay zeka sağlayıcılarına gönderilir.</p>"],
    ["4. Hizmet sağlayıcılar", null],
    ["5. Satın almalar", "<p>Abonelikler (Free / Pro / MAX) ve krediler Apple App Store veya Google Play tarafından işlenir. Kart bilgilerinizi almaz veya saklamayız; yalnızca özellikleri açmak için abonelik durumunu (RevenueCat ile) alırız. Mağaza hesabınızdan istediğiniz zaman yönetin veya iptal edin.</p>"],
    ["6. Analitik", "<p>Verilerinizi satmaz ve reklam profillemesi için kullanmayız. Tanılamalar anonim, toplu kararlılık bilgileriyle sınırlıdır.</p>"],
    ["7. Çocuklar", "<p>Uygulama, mağazanızın belirlediği yaşın altındaki çocuklara yönelik değildir. Bilerek çocuk verisi toplamayız.</p>"],
    ["8. Tercihleriniz ve haklarınız", "<p>Yüklemeler otomatik silindiği ve hesap tutulmadığı için yönetilecek kişisel veri azdır. Talepleriniz için <a class=\"rm-mail\">EMAIL</a> adresine yazın.</p>"],
    ["9. Değişiklikler", "<p>Bu politikayı güncelleyebiliriz; \"Son güncelleme\" tarihi buna göre değişir.</p>"],
  ]);
  P("vi", "Reel Make — Chính sách quyền riêng tư", "Cập nhật lần cuối", "Chính sách này giải thích cách <b>Reel Make</b> (\"Ứng dụng\"), do TrailFusion AI vận hành (\"chúng tôi\"), xử lý thông tin của bạn. Khi dùng Ứng dụng, bạn đồng ý với chính sách này.", [
    ["1. Không cần tài khoản", "<p>Ứng dụng không yêu cầu tạo tài khoản hay đăng nhập. Chúng tôi không thu thập tên, email hay danh bạ của bạn.</p>"],
    ["2. Ảnh và video bạn chọn", "<p>Để tạo reel, ảnh và video bạn chọn được tải lên dịch vụ kết xuất đám mây (Cloudflare R2) và xử lý bằng AI. <b>Tệp tải lên và kết quả tự động xóa trong khoảng 7 ngày</b> và <b>không bao giờ dùng để huấn luyện mô hình AI</b>. Ứng dụng chỉ truy cập nội dung bạn chọn; không quét thư viện.</p>"],
    ["3. Văn bản bạn nhập", "<p>Lời nhắc, chủ đề, phụ đề và văn bản thương hiệu bạn nhập được gửi tới nhà cung cấp AI để tạo kịch bản, lồng tiếng và văn bản trên màn hình.</p>"],
    ["4. Nhà cung cấp dịch vụ", null],
    ["5. Mua hàng", "<p>Gói đăng ký (Free / Pro / MAX) và tín dụng do Apple App Store hoặc Google Play xử lý. Chúng tôi không nhận hay lưu thông tin thẻ; chỉ nhận trạng thái đăng ký (qua RevenueCat) để mở khóa tính năng. Quản lý hoặc hủy bất cứ lúc nào trong tài khoản cửa hàng.</p>"],
    ["6. Phân tích", "<p>Chúng tôi không bán dữ liệu của bạn hay dùng cho hồ sơ quảng cáo. Mọi chẩn đoán chỉ giới hạn ở dữ liệu ổn định ẩn danh, tổng hợp.</p>"],
    ["7. Trẻ em", "<p>Ứng dụng không hướng đến trẻ em dưới độ tuổi mà cửa hàng của bạn yêu cầu. Chúng tôi không cố ý thu thập dữ liệu của trẻ em.</p>"],
    ["8. Lựa chọn và quyền của bạn", "<p>Vì nội dung tải lên tự xóa và không lưu tài khoản, có rất ít dữ liệu cá nhân cần quản lý. Mọi yêu cầu xin gửi tới <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. Thay đổi", "<p>Chúng tôi có thể cập nhật chính sách; ngày \"Cập nhật lần cuối\" sẽ thay đổi tương ứng.</p>"],
  ]);
  P("th", "Reel Make — นโยบายความเป็นส่วนตัว", "อัปเดตล่าสุด", "นโยบายนี้อธิบายวิธีที่ <b>Reel Make</b> (\"แอป\") ดำเนินการโดย TrailFusion AI (\"เรา\") จัดการข้อมูลของคุณ การใช้แอปถือว่าคุณยอมรับนโยบายนี้", [
    ["1. ไม่ต้องมีบัญชี", "<p>แอปไม่ต้องสมัครหรือเข้าสู่ระบบ เราไม่เก็บชื่อ อีเมล หรือรายชื่อผู้ติดต่อของคุณ</p>"],
    ["2. รูปและวิดีโอที่คุณเลือก", "<p>เพื่อสร้างรีล รูปและวิดีโอที่เลือกจะถูกอัปโหลดไปยังบริการเรนเดอร์บนคลาวด์ (Cloudflare R2) และประมวลผลด้วย AI <b>ไฟล์ที่อัปโหลดและผลลัพธ์จะถูกลบอัตโนมัติภายในประมาณ 7 วัน</b> และ<b>ไม่ถูกใช้ฝึกโมเดล AI เด็ดขาด</b> แอปเข้าถึงเฉพาะสื่อที่คุณเลือก ไม่สแกนคลังภาพทั้งหมด</p>"],
    ["3. ข้อความที่คุณป้อน", "<p>พรอมต์ ธีม คำบรรยาย และข้อความแบรนด์ที่คุณป้อนจะถูกส่งไปยังผู้ให้บริการ AI เพื่อสร้างสคริปต์ เสียงพากย์ และข้อความบนจอ</p>"],
    ["4. ผู้ให้บริการ", null],
    ["5. การซื้อ", "<p>การสมัครสมาชิก (Free / Pro / MAX) และเครดิตดำเนินการโดย Apple App Store หรือ Google Play เราไม่รับหรือเก็บข้อมูลบัตรของคุณ รับเพียงสถานะการสมัคร (ผ่าน RevenueCat) เพื่อปลดล็อกฟีเจอร์ จัดการหรือยกเลิกได้ทุกเมื่อในบัญชีสโตร์</p>"],
    ["6. การวิเคราะห์", "<p>เราไม่ขายข้อมูลของคุณหรือใช้ทำโปรไฟล์โฆษณา การวินิจฉัยจำกัดเฉพาะข้อมูลเสถียรภาพแบบนิรนามและรวมกลุ่ม</p>"],
    ["7. เด็ก", "<p>แอปไม่ได้มุ่งเป้าไปที่เด็กที่อายุต่ำกว่าที่สโตร์ของคุณกำหนด เราไม่เก็บข้อมูลเด็กโดยเจตนา</p>"],
    ["8. สิทธิ์ของคุณ", "<p>เนื่องจากไฟล์อัปโหลดถูกลบอัตโนมัติและไม่เก็บบัญชี จึงแทบไม่มีข้อมูลส่วนบุคคลให้จัดการ หากมีคำขอโปรดติดต่อ <a class=\"rm-mail\">EMAIL</a></p>"],
    ["9. การเปลี่ยนแปลง", "<p>เราอาจปรับปรุงนโยบายนี้ และวันที่ \"อัปเดตล่าสุด\" จะเปลี่ยนตาม</p>"],
  ]);
  P("hi", "Reel Make — गोपनीयता नीति", "अंतिम अपडेट", "यह नीति बताती है कि TrailFusion AI द्वारा संचालित <b>Reel Make</b> (\"ऐप\") आपकी जानकारी कैसे संभालता है। ऐप का उपयोग करके आप इस नीति से सहमत होते हैं।", [
    ["1. खाता आवश्यक नहीं", "<p>ऐप के लिए खाता या साइन-इन ज़रूरी नहीं है। हम आपका नाम, ईमेल या संपर्क सूची एकत्र नहीं करते।</p>"],
    ["2. आपके चुने फ़ोटो और वीडियो", "<p>रील बनाने के लिए चुने गए फ़ोटो और वीडियो हमारी क्लाउड रेंडर सेवा (Cloudflare R2) पर अपलोड होते हैं और AI द्वारा प्रोसेस होते हैं। <b>अपलोड फ़ाइलें और परिणाम लगभग 7 दिनों में स्वतः हट जाते हैं</b> और <b>AI मॉडल प्रशिक्षण में कभी उपयोग नहीं होते</b>। ऐप केवल आपके चुने मीडिया तक पहुँचता है; पूरी लाइब्रेरी स्कैन नहीं करता।</p>"],
    ["3. आपके द्वारा दर्ज टेक्स्ट", "<p>आपके प्रॉम्प्ट, थीम, कैप्शन और ब्रांड टेक्स्ट स्क्रिप्ट, नैरेशन और स्क्रीन टेक्स्ट बनाने के लिए AI प्रदाताओं को भेजे जाते हैं।</p>"],
    ["4. सेवा प्रदाता", null],
    ["5. खरीदारी", "<p>सदस्यता (Free / Pro / MAX) और क्रेडिट Apple App Store या Google Play द्वारा संसाधित होते हैं। हम आपके कार्ड विवरण न लेते न संग्रहीत करते; सुविधाएँ अनलॉक करने हेतु केवल सदस्यता स्थिति (RevenueCat के माध्यम से) प्राप्त करते हैं। स्टोर खाते में कभी भी प्रबंधित या रद्द करें।</p>"],
    ["6. एनालिटिक्स", "<p>हम आपका डेटा न बेचते न विज्ञापन प्रोफाइलिंग के लिए उपयोग करते। कोई भी डायग्नोस्टिक्स अनाम, समेकित ऐप-स्थिरता जानकारी तक सीमित है।</p>"],
    ["7. बच्चे", "<p>ऐप आपके स्टोर द्वारा निर्धारित आयु से कम के बच्चों के लिए नहीं है। हम जानबूझकर बच्चों का डेटा एकत्र नहीं करते।</p>"],
    ["8. आपके अधिकार", "<p>चूँकि अपलोड स्वतः हट जाते हैं और कोई खाता नहीं रखा जाता, प्रबंधन हेतु बहुत कम व्यक्तिगत डेटा है। किसी भी अनुरोध के लिए <a class=\"rm-mail\">EMAIL</a> पर संपर्क करें।</p>"],
    ["9. बदलाव", "<p>हम इस नीति को अपडेट कर सकते हैं; \"अंतिम अपडेट\" तिथि तदनुसार बदलेगी।</p>"],
  ]);
  P("ar", "Reel Make — سياسة الخصوصية", "آخر تحديث", "توضح هذه السياسة كيفية تعامل <b>Reel Make</b> (\"التطبيق\")، الذي تُشغّله TrailFusion AI (\"نحن\")، مع معلوماتك. باستخدامك التطبيق فإنك توافق على هذه السياسة.", [
    ["1. لا حاجة لحساب", "<p>لا يتطلب التطبيق إنشاء حساب أو تسجيل دخول. لا نجمع اسمك أو بريدك أو جهات اتصالك.</p>"],
    ["2. الصور والمقاطع التي تختارها", "<p>لإنشاء ريلز، تُرفع الصور والمقاطع التي تختارها إلى خدمة المعالجة السحابية (Cloudflare R2) وتُعالَج بالذكاء الاصطناعي. <b>تُحذف الملفات المرفوعة والنتائج تلقائيًا خلال نحو 7 أيام</b> و<b>لا تُستخدم أبدًا لتدريب نماذج الذكاء الاصطناعي</b>. يصل التطبيق فقط إلى الوسائط التي تحددها ولا يفحص مكتبتك.</p>"],
    ["3. النص الذي تُدخله", "<p>تُرسل المطالبات والسمات والترجمات ونص العلامة التجارية التي تُدخلها إلى مزوّدي الذكاء الاصطناعي لإنشاء النص والتعليق الصوتي والنص على الشاشة.</p>"],
    ["4. مزوّدو الخدمة", null],
    ["5. المشتريات", "<p>تتم معالجة الاشتراكات (Free / Pro / MAX) والأرصدة عبر Apple App Store أو Google Play. لا نستلم أو نخزّن بيانات بطاقتك؛ نستلم فقط حالة الاشتراك (عبر RevenueCat) لفتح الميزات. يمكنك الإدارة أو الإلغاء في أي وقت من حساب المتجر.</p>"],
    ["6. التحليلات", "<p>لا نبيع بياناتك ولا نستخدمها للتنميط الإعلاني. تقتصر أي تشخيصات على معلومات استقرار مجهّلة ومجمّعة.</p>"],
    ["7. الأطفال", "<p>التطبيق غير موجّه للأطفال دون السن الذي يحدده متجرك. لا نجمع عمدًا بيانات الأطفال.</p>"],
    ["8. خياراتك وحقوقك", "<p>بما أن المرفوعات تُحذف تلقائيًا ولا نحتفظ بحساب، فلا توجد تقريبًا بيانات شخصية لإدارتها. لأي طلب راسلنا على <a class=\"rm-mail\">EMAIL</a>.</p>"],
    ["9. التغييرات", "<p>قد نحدّث هذه السياسة، وسيتغير تاريخ \"آخر تحديث\" وفقًا لذلك.</p>"],
  ]);

  // terms: sections = [ [heading, bodyHTML], ... ]. Same shape as privacy.
  // Date is hardcoded per-language (not derived from Date.now()).
  const TERMS = {};
  const TERMS_UPDATED = { en: "June 2026", ja: "2026年6月" };
  function T(lang, h1, updatedLabel, intro, secs) { TERMS[lang] = { badge: ((UI[lang] || UI.en).terms || "Terms of Service").toUpperCase(), h1, updatedLabel, intro, sections: secs }; }

  T("en", "Reel Make — Terms of Service", "Last updated", "These Terms of Service (\"Terms\") govern your use of <b>Reel Make</b> (\"the App\"), an AI reel-video generator operated by TrailFusion AI (\"we\", \"us\"). By downloading, accessing, or using the App, you agree to these Terms. If you do not agree, do not use the App.", [
    ["1. Agreement to Terms", "<p>By using the App you confirm that you have read, understood, and agree to be bound by these Terms and by our <a href=\"reelmake-privacy.html\">Privacy Policy</a>. We may also reference additional rules from the Apple App Store or Google Play, which apply to your use of the App.</p>"],
    ["2. Service Description", "<p>The App lets you select your own photos and videos, enter a prompt, theme, voice, and other settings, and then generates a finished short-form \"reel\" video using AI. Generation is performed on our cloud services. Features, formats, and limits may change over time as we improve the App.</p>"],
    ["3. Eligibility & Accounts", "<p>You must be old enough to form a binding contract and meet the minimum age required by your app store. The App does not require you to create an account with us; access is tied to your device and your Apple or Google account. You are responsible for activity that occurs through your device.</p>"],
    ["4. Subscriptions & Billing", "<p>The App offers a free tier and paid auto-renewing subscriptions:</p><ul><li><b>Free</b> — basic access with limited renders, features, and a watermark, subject to the limits shown in the App.</li><li><b>Pro</b> and <b>MAX</b> — expanded limits, faster processing, and additional features.</li></ul><p>Subscriptions are billed through your <b>Apple App Store</b> or <b>Google Play</b> account at the price shown at purchase. <b>Prices may vary by region</b> and may change with notice as permitted by the stores.</p><p><b>Auto-renewal:</b> subscriptions renew automatically for the same period unless you cancel at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the period ends.</p><p><b>How to cancel:</b> manage or cancel your subscription anytime in your device's store account settings (Apple: Settings &gt; your name &gt; Subscriptions; Google Play: Subscriptions). Uninstalling the App does not cancel a subscription. Cancellation takes effect at the end of the current billing period; you keep paid access until then.</p>"],
    ["5. Credits (Consumable Purchases)", "<p>The App may offer <b>credits</b> as consumable in-app purchases. Credits are a limited license to use generation features and are consumed each time you render. Credits are <b>one-time purchases</b>, have no cash value, are not transferable, and are <b>non-refundable except where required by law</b>. Unused credits may expire if stated at purchase. We are not responsible for credits lost due to misuse or violations of these Terms.</p>"],
    ["6. Refunds", "<p>All purchases (subscriptions and credits) are processed by Apple or Google. <b>Refunds are handled by Apple or Google under their respective policies</b>, not by us. Please direct refund requests to the App Store or Google Play. We do not receive or store your payment-card details.</p>"],
    ["7. User Content & Conduct", "<p>You retain ownership of the photos, videos, and text you supply (\"User Content\"). You represent that you own or have all necessary rights, licenses, and consents to your User Content and to its processing by the App. You must not upload or generate content that:</p><ul><li>is illegal, infringing, defamatory, or violates others' privacy or intellectual-property rights;</li><li>uses another person's likeness, name, or voice without their consent;</li><li>is sexually explicit involving minors, or is hateful, harassing, or violent;</li><li>attempts to disrupt, reverse-engineer, or abuse the App or its providers.</li></ul><p>You are solely responsible for your User Content and how you use the generated videos.</p>"],
    ["8. Intellectual Property", "<p>The App, its software, design, and branding are owned by us and our licensors and are protected by law. Subject to these Terms and your payment of any applicable fees, we grant you a limited, non-exclusive, non-transferable license to use the App. As between you and us, you own the output video you generate from your own User Content, and you may use it for personal or commercial purposes, provided you comply with these Terms and the terms of any third-party AI providers.</p>"],
    ["9. AI-Generated Content", "<p>The App uses third-party AI models to generate scripts, narration, on-screen text, and video composition. AI output may be inaccurate, unexpected, or similar to content generated for others, and may not reflect your exact intent. Results are provided without any guarantee of accuracy, suitability, or originality. You are responsible for reviewing generated content before publishing or sharing it.</p>"],
    ["10. Disclaimers & Limitation of Liability", "<p>The App is provided <b>\"as is\"</b> and <b>\"as available\"</b> without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or content, arising from your use of the App. Our total liability for any claim is limited to the amount you paid for the App in the 12 months before the claim.</p>"],
    ["11. Termination", "<p>You may stop using the App at any time. We may suspend or terminate your access if you violate these Terms or use the App in a way that harms us, other users, or our providers. Sections that by their nature should survive termination (including intellectual property, disclaimers, and limitation of liability) will continue to apply.</p>"],
    ["12. Changes to Terms", "<p>We may update these Terms from time to time. When we make material changes, we will update the \"Last updated\" date below. Your continued use of the App after changes take effect constitutes acceptance of the revised Terms.</p>"],
    ["13. Governing Law & Contact", "<p>These Terms are governed by the laws of Japan, without regard to conflict-of-law rules. For questions about these Terms, contact <a class=\"rm-mail\">EMAIL</a>.</p>"],
  ]);
  T("ja", "Reel Make — 利用規約", "最終更新日", "本利用規約（以下「本規約」）は、TrailFusion AI（以下「当社」）が提供するAIリール動画生成アプリ <b>Reel Make</b>（以下「本アプリ」）の利用条件を定めるものです。本アプリをダウンロード・アクセス・利用することで、本規約に同意したものとみなします。同意いただけない場合は本アプリをご利用にならないでください。", [
    ["1. 本規約への同意", "<p>本アプリを利用することで、本規約および<a href=\"reelmake-privacy.html\">プライバシーポリシー</a>を読み、理解し、これらに拘束されることに同意したものとみなします。あわせて Apple App Store または Google Play の規約も適用されます。</p>"],
    ["2. サービス内容", "<p>本アプリでは、ご自身の写真・動画を選択し、プロンプト・テーマ・音声などの設定を入力すると、AIが短尺の「リール」動画を生成します。生成処理は当社のクラウド上で行われます。機能・出力形式・各種上限は、品質向上のため随時変更されることがあります。</p>"],
    ["3. 利用資格", "<p>本アプリを利用するには、有効な契約を締結できる年齢、かつ各ストアが定める最低年齢に達している必要があります。本アプリの利用に当社へのアカウント登録は不要で、アクセスはお使いの端末および Apple／Google アカウントに紐づきます。端末を通じて行われる操作についてはお客様が責任を負います。</p>"],
    ["4. 自動更新サブスクリプションと課金", "<p>本アプリは無料プランと、自動更新の有料サブスクリプションを提供します。</p><ul><li><b>Free</b> … 基本機能。レンダリング回数や機能に制限があり、透かしが入る場合があります（アプリ内表示の上限に従います）。</li><li><b>Pro</b>・<b>MAX</b> … 上限の拡大、処理の高速化、追加機能。</li></ul><p>課金は購入時に表示される価格で、<b>Apple App Store</b> または <b>Google Play</b> のアカウントを通じて行われます。<b>価格は地域により異なる</b>場合があり、各ストアが認める範囲で告知のうえ変更されることがあります。</p><p><b>自動更新：</b>現在の期間終了の少なくとも24時間前に解約しない限り、サブスクリプションは同じ期間で自動的に更新されます。更新料金は期間終了前24時間以内に請求されます。</p><p><b>解約方法：</b>解約はいつでも端末のストアアカウント設定から行えます（Apple：設定＞ユーザー名＞サブスクリプション／Google Play：定期購入）。本アプリを削除しても解約にはなりません。解約は現在の請求期間の終了時に有効となり、それまでは有料機能をご利用いただけます。</p>"],
    ["5. クレジット（消耗型アプリ内課金）", "<p>本アプリは <b>クレジット</b> を消耗型のアプリ内課金として提供する場合があります。クレジットは生成機能を利用するための限定的なライセンスであり、レンダリングのたびに消費されます。クレジットは<b>都度購入</b>で、現金的価値はなく、譲渡できず、<b>法令で求められる場合を除き返金されません</b>。購入時に明示された場合、未使用クレジットは有効期限により失効することがあります。誤用や本規約違反により失われたクレジットについて当社は責任を負いません。</p>"],
    ["6. 返金", "<p>すべての購入（サブスクリプションおよびクレジット）は Apple または Google が処理します。<b>返金は当社ではなく、Apple または Google の各ポリシーに従って取り扱われます</b>。返金のご依頼は App Store または Google Play へお願いします。当社がカード情報を受領・保存することはありません。</p>"],
    ["7. ユーザーコンテンツと禁止事項", "<p>お客様が提供する写真・動画・テキスト（以下「ユーザーコンテンツ」）の権利はお客様に帰属します。お客様は、ユーザーコンテンツおよびそれを本アプリで処理することについて、必要なすべての権利・ライセンス・同意を有していることを表明します。次のコンテンツのアップロードや生成は禁止します。</p><ul><li>違法・権利侵害・名誉毀損にあたるもの、他者のプライバシーや知的財産権を侵害するもの</li><li>本人の同意なく第三者の肖像・氏名・声を使用するもの</li><li>未成年が関わる性的表現、差別的・嫌がらせ的・暴力的なもの</li><li>本アプリやその提供者の妨害・リバースエンジニアリング・不正利用を試みるもの</li></ul><p>ユーザーコンテンツおよび生成された動画の利用については、お客様が単独で責任を負います。</p>"],
    ["8. 知的財産", "<p>本アプリ、そのソフトウェア・デザイン・ブランドは当社およびライセンサーに帰属し、法律で保護されています。本規約の遵守および該当する料金の支払いを条件に、当社はお客様に対し、本アプリを利用するための限定的・非独占的・譲渡不可のライセンスを付与します。当社とお客様との関係において、ご自身のユーザーコンテンツから生成した出力動画はお客様に帰属し、本規約および各AI提供者の規約を遵守する限り、個人利用・商用利用いずれにも使用できます。</p>"],
    ["9. AI生成物に関する免責", "<p>本アプリは第三者のAIモデルを用いて、台本・ナレーション・画面テキスト・動画構成を生成します。AIの生成結果は不正確・予期しないもの・他者向けの生成物と類似する場合があり、お客様の意図を正確に反映しないことがあります。結果は正確性・適合性・独自性についていかなる保証もなく提供されます。公開・共有の前に、生成内容をご自身で確認する責任はお客様にあります。</p>"],
    ["10. 免責・責任の制限", "<p>本アプリは<b>現状有姿（\"as is\"）</b>かつ<b>提供可能な範囲（\"as available\"）</b>で提供され、商品性・特定目的への適合性・非侵害を含む明示黙示のいかなる保証も行いません。法令で許容される最大限の範囲で、当社は本アプリの利用に起因する間接的・付随的・特別・結果的・懲罰的損害、データ・利益・コンテンツの喪失について責任を負いません。当社の賠償責任の総額は、請求の発生前12か月間にお客様が本アプリに支払った金額を上限とします。</p>"],
    ["11. 利用停止", "<p>お客様はいつでも本アプリの利用を中止できます。お客様が本規約に違反した場合、または当社・他の利用者・提供者に損害を与える方法で本アプリを利用した場合、当社はアクセスを停止または終了できます。性質上存続すべき条項（知的財産、免責、責任の制限を含む）は終了後も有効に存続します。</p>"],
    ["12. 規約の変更", "<p>当社は本規約を随時改定することがあります。重要な変更を行う場合、下記の「最終更新日」を更新します。変更の発効後も本アプリを継続して利用した場合、改定後の規約に同意したものとみなします。</p>"],
    ["13. 準拠法・お問い合わせ", "<p>本規約は日本法に準拠し、抵触法の規定は適用されません。本規約に関するお問い合わせは <a class=\"rm-mail\">EMAIL</a> までご連絡ください。</p>"],
  ]);

  // sub-processor list (section 4) — localize labels, keep provider names
  const SUB = {
    en: ["<b>Google (Gemini)</b> — AI service that receives your selected photos/video frames & text to recognize them and generate the script", "<b>Microsoft (Azure)</b> — AI service that receives the narration text to synthesize the voice", "<b>Cloudflare R2</b> — temporary storage of uploads & rendered videos", "<b>Supabase</b> — secure server-side key management", "<b>RevenueCat, Apple, Google</b> — subscription purchases & entitlement status"],
    ja: ["<b>Google（Gemini）</b> … 選択した写真・動画フレームと入力テキストを受け取り、画像認識と台本生成を行うAIサービス", "<b>Microsoft（Azure）</b> … ナレーション原稿を受け取り音声を合成するAIサービス", "<b>Cloudflare R2</b> … アップロード/生成動画の一時保管", "<b>Supabase</b> … サーバー側の鍵管理", "<b>RevenueCat・Apple・Google</b> … サブスク購入と権利状態"],
  };
  // Consent + equal-protection note shown after the section-4 provider list.
  // Required by App Store Guideline 5.1.1(i)/5.1.2(i).
  const SUBNOTE = {
    en: "<p>These providers process data only to deliver the App's features, under their own privacy terms. <b>The App asks for your explicit in-app consent before any photo, video, or text is sent to the third-party AI services above (Google Gemini, Microsoft Azure)</b>, and you can withdraw that consent anytime in Settings. We only share data with third parties that provide the same or equivalent data protection, and your content is never used to train AI models.</p>",
    ja: "<p>これらの提供者は、各社のプライバシー規約のもと、本アプリの機能提供のためにのみデータを処理します。<b>本アプリは、写真・動画・テキストを上記の第三者AIサービス（Google Gemini、Microsoft Azure）へ送信する前に、アプリ内で明示的な同意を取得します。</b>同意は設定画面からいつでも取り消せます。データを共有する第三者は同等以上のデータ保護を提供する事業者に限り、あなたのコンテンツがAIの学習に使われることはありません。</p>",
    "zh-Hans": "<p>这些提供商仅在各自隐私条款下为实现应用功能而处理数据。<b>在将任何照片、视频或文本发送给上述第三方 AI 服务（Google Gemini、Microsoft Azure）之前，应用会在应用内征得您的明确同意</b>，您可随时在设置中撤销。我们仅与提供同等或更强数据保护的第三方共享数据，且您的内容绝不用于训练 AI 模型。</p>",
    ko: "<p>이 제공업체들은 각자의 개인정보 약관에 따라 앱 기능 제공을 위해서만 데이터를 처리합니다. <b>사진·영상·텍스트를 위 제3자 AI 서비스(Google Gemini, Microsoft Azure)로 전송하기 전에 앱 내에서 명시적 동의를 받습니다.</b> 동의는 설정에서 언제든지 철회할 수 있습니다. 동등하거나 더 강한 데이터 보호를 제공하는 제3자와만 공유하며, 콘텐츠는 AI 모델 학습에 사용되지 않습니다.</p>",
    es: "<p>Estos proveedores procesan datos solo para ofrecer las funciones de la App, según sus propios términos de privacidad. <b>La App pide tu consentimiento explícito en la app antes de enviar cualquier foto, vídeo o texto a los servicios de IA de terceros anteriores (Google Gemini, Microsoft Azure)</b>, y puedes retirarlo en cualquier momento en Ajustes. Solo compartimos datos con terceros que ofrecen una protección igual o equivalente, y tu contenido nunca se usa para entrenar modelos de IA.</p>",
    "pt-BR": "<p>Esses provedores processam dados apenas para oferecer os recursos do App, sob seus próprios termos de privacidade. <b>O App solicita seu consentimento explícito no app antes de enviar qualquer foto, vídeo ou texto aos serviços de IA de terceiros acima (Google Gemini, Microsoft Azure)</b>, e você pode retirá-lo a qualquer momento nas Configurações. Só compartilhamos dados com terceiros que oferecem proteção igual ou equivalente, e seu conteúdo nunca é usado para treinar modelos de IA.</p>",
    fr: "<p>Ces prestataires traitent les données uniquement pour fournir les fonctionnalités de l'App, selon leurs propres conditions de confidentialité. <b>L'App demande votre consentement explicite dans l'app avant d'envoyer toute photo, vidéo ou texte aux services d'IA tiers ci-dessus (Google Gemini, Microsoft Azure)</b>, et vous pouvez le retirer à tout moment dans les Réglages. Nous ne partageons des données qu'avec des tiers offrant une protection égale ou équivalente, et votre contenu ne sert jamais à entraîner des modèles d'IA.</p>",
    de: "<p>Diese Anbieter verarbeiten Daten nur zur Bereitstellung der App-Funktionen, gemäß ihren eigenen Datenschutzbedingungen. <b>Die App holt deine ausdrückliche In-App-Zustimmung ein, bevor Fotos, Videos oder Texte an die oben genannten Drittanbieter-KI-Dienste (Google Gemini, Microsoft Azure) gesendet werden</b>, und du kannst sie jederzeit in den Einstellungen widerrufen. Wir teilen Daten nur mit Dritten, die ein gleichwertiges Schutzniveau bieten, und deine Inhalte werden nie zum Training von KI-Modellen verwendet.</p>",
    it: "<p>Questi fornitori trattano i dati solo per offrire le funzioni dell'App, secondo le proprie condizioni sulla privacy. <b>L'App richiede il tuo consenso esplicito nell'app prima di inviare foto, video o testo ai servizi di IA di terze parti sopra indicati (Google Gemini, Microsoft Azure)</b>, e puoi revocarlo in qualsiasi momento nelle Impostazioni. Condividiamo i dati solo con terzi che offrono una protezione uguale o equivalente, e i tuoi contenuti non vengono mai usati per addestrare modelli di IA.</p>",
    ru: "<p>Эти поставщики обрабатывают данные только для предоставления функций приложения, согласно своим условиям конфиденциальности. <b>Приложение запрашивает ваше явное согласие в приложении, прежде чем отправить любые фото, видео или текст указанным сторонним ИИ-сервисам (Google Gemini, Microsoft Azure)</b>, и вы можете отозвать его в любой момент в настройках. Мы передаём данные только третьим лицам с равной или более сильной защитой, и ваш контент никогда не используется для обучения ИИ.</p>",
    tr: "<p>Bu sağlayıcılar verileri yalnızca Uygulamanın özelliklerini sunmak için kendi gizlilik koşulları kapsamında işler. <b>Uygulama, herhangi bir foto, video veya metni yukarıdaki üçüncü taraf yapay zekâ hizmetlerine (Google Gemini, Microsoft Azure) göndermeden önce uygulama içinde açık onayınızı ister</b> ve bunu istediğiniz zaman Ayarlar'dan geri çekebilirsiniz. Verileri yalnızca eşit veya daha güçlü koruma sağlayan üçüncü taraflarla paylaşırız ve içeriğiniz asla yapay zekâ modeli eğitiminde kullanılmaz.</p>",
    vi: "<p>Các nhà cung cấp này chỉ xử lý dữ liệu để cung cấp tính năng của Ứng dụng, theo điều khoản riêng tư của họ. <b>Ứng dụng yêu cầu sự đồng ý rõ ràng trong ứng dụng trước khi gửi bất kỳ ảnh, video hoặc văn bản nào tới các dịch vụ AI bên thứ ba ở trên (Google Gemini, Microsoft Azure)</b>, và bạn có thể thu hồi bất cứ lúc nào trong Cài đặt. Chúng tôi chỉ chia sẻ dữ liệu với bên thứ ba có mức bảo vệ tương đương hoặc cao hơn, và nội dung của bạn không bao giờ dùng để huấn luyện mô hình AI.</p>",
    th: "<p>ผู้ให้บริการเหล่านี้ประมวลผลข้อมูลเพื่อให้บริการฟีเจอร์ของแอปเท่านั้น ภายใต้ข้อกำหนดความเป็นส่วนตัวของแต่ละราย <b>แอปจะขอความยินยอมอย่างชัดเจนในแอปก่อนส่งรูปภาพ วิดีโอ หรือข้อความใด ๆ ไปยังบริการ AI ของบุคคลที่สามข้างต้น (Google Gemini, Microsoft Azure)</b> และคุณเพิกถอนได้ทุกเมื่อในการตั้งค่า เราแชร์ข้อมูลกับบุคคลที่สามที่ให้การคุ้มครองเทียบเท่าหรือสูงกว่าเท่านั้น และเนื้อหาของคุณจะไม่ถูกใช้ฝึกโมเดล AI</p>",
    hi: "<p>ये प्रदाता केवल ऐप की सुविधाएँ देने के लिए, अपनी गोपनीयता शर्तों के तहत डेटा प्रोसेस करते हैं। <b>किसी भी फ़ोटो, वीडियो या टेक्स्ट को ऊपर दिए तृतीय-पक्ष AI सेवाओं (Google Gemini, Microsoft Azure) को भेजने से पहले ऐप आपकी स्पष्ट इन-ऐप सहमति लेता है</b>, और आप इसे सेटिंग्स में कभी भी वापस ले सकते हैं। हम केवल समान या अधिक सुरक्षा देने वाले तृतीय पक्षों के साथ डेटा साझा करते हैं, और आपकी सामग्री कभी AI मॉडल प्रशिक्षण में उपयोग नहीं होती।</p>",
    ar: "<p dir=\"rtl\">يعالج هؤلاء المزوّدون البيانات فقط لتقديم ميزات التطبيق، وفق شروط الخصوصية الخاصة بهم. <b>يطلب التطبيق موافقتك الصريحة داخله قبل إرسال أي صورة أو فيديو أو نص إلى خدمات الذكاء الاصطناعي التابعة لجهات خارجية أعلاه (Google Gemini وMicrosoft Azure)</b>، ويمكنك سحبها في أي وقت من الإعدادات. لا نشارك البيانات إلا مع جهات توفّر حماية مماثلة أو أقوى، ولا يُستخدم محتواك أبدًا لتدريب نماذج الذكاء الاصطناعي.</p>",
  };
  function noteFor(lang) { return SUBNOTE[lang] || SUBNOTE.en; }

  function subFor(lang) {
    if (SUB[lang]) return SUB[lang];
    const dash = lang === "ar" ? " — " : " — ";
    const t = {
      img: { "zh-Hans": "图像理解与脚本生成", ko: "이미지 이해·대본 생성", es: "comprensión de imágenes y guion", "pt-BR": "compreensão de imagens e roteiro", fr: "compréhension d'images et script", de: "Bildverständnis & Skript", it: "comprensione immagini e copione", ru: "распознавание изображений и сценарий", tr: "görüntü anlama ve senaryo", vi: "hiểu hình ảnh & kịch bản", th: "เข้าใจภาพและสร้างสคริปต์", hi: "इमेज समझ व स्क्रिप्ट", ar: "فهم الصور وإنشاء النص" },
      tts: { "zh-Hans": "配音语音合成", ko: "내레이션 음성합성", es: "voz de narración", "pt-BR": "voz da narração", fr: "voix off", de: "Sprachausgabe", it: "voce narrante", ru: "синтез озвучки", tr: "seslendirme", vi: "tổng hợp lồng tiếng", th: "สังเคราะห์เสียงพากย์", hi: "नैरेशन वॉइस", ar: "تعليق صوتي" },
      r2: { "zh-Hans": "上传/生成视频的临时存储", ko: "업로드/생성 영상 임시 저장", es: "almacenamiento temporal", "pt-BR": "armazenamento temporário", fr: "stockage temporaire", de: "temporäre Speicherung", it: "archiviazione temporanea", ru: "временное хранение", tr: "geçici depolama", vi: "lưu trữ tạm thời", th: "จัดเก็บชั่วคราว", hi: "अस्थायी भंडारण", ar: "تخزين مؤقت" },
      sb: { "zh-Hans": "服务端密钥管理", ko: "서버 측 키 관리", es: "gestión de claves en el servidor", "pt-BR": "gestão de chaves no servidor", fr: "gestion des clés côté serveur", de: "serverseitige Schlüsselverwaltung", it: "gestione chiavi lato server", ru: "управление ключами на сервере", tr: "sunucu tarafı anahtar yönetimi", vi: "quản lý khóa phía máy chủ", th: "จัดการคีย์ฝั่งเซิร์ฟเวอร์", hi: "सर्वर-साइड की प्रबंधन", ar: "إدارة المفاتيح على الخادم" },
      rc: { "zh-Hans": "订阅购买与权利状态", ko: "구독 구매·권리 상태", es: "compras de suscripción y estado", "pt-BR": "compras de assinatura e status", fr: "achats d'abonnement et statut", de: "Abo-Käufe & Berechtigung", it: "acquisti abbonamento e stato", ru: "покупки подписки и статус", tr: "abonelik satın alma ve durum", vi: "mua đăng ký & trạng thái", th: "การซื้อสมาชิกและสถานะสิทธิ์", hi: "सदस्यता खरीद व अधिकार स्थिति", ar: "مشتريات الاشتراك وحالته" },
    };
    const g = (k) => t[k][lang] || t[k].en || "";
    return [
      "<b>Google (Gemini)</b>" + dash + g("img"),
      "<b>Microsoft (Azure)</b>" + dash + g("tts"),
      "<b>Cloudflare R2</b>" + dash + g("r2"),
      "<b>Supabase</b>" + dash + g("sb"),
      "<b>RevenueCat, Apple, Google</b>" + dash + g("rc"),
    ];
  }

  function pick() {
    const saved = localStorage.getItem("rm_lang");
    if (saved && UI[saved]) return saved;
    const cands = (navigator.languages || [navigator.language || "en"]);
    for (let c of cands) {
      c = c.toLowerCase();
      if (c.startsWith("zh")) return "zh-Hans";
      if (c.startsWith("pt")) return "pt-BR";
      const two = c.split("-")[0];
      const hit = LANGS.find(([k]) => k.toLowerCase() === c || k.split("-")[0] === two);
      if (hit) return hit[0];
    }
    return "en";
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function build(lang, page) {
    const ui = UI[lang] || UI.en;
    const rtl = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    const mail = `<a href="mailto:${EMAIL}?subject=Reel%20Make" class="text-coral font-bold">${EMAIL}</a>`;
    let inner = "";
    if (page === "support") {
      const d = SUPPORT[lang] || SUPPORT.en;
      inner =
        `<img src="assets/reelmake/logo.png" alt="Reel Make" class="w-32 h-32 rounded-3xl border-2 border-navy object-cover mx-auto mb-6">` +
        `<span class="sticker sticker-coral">${esc(d.badge)}</span>` +
        `<h1 class="display-xl text-3xl md:text-5xl text-navy mt-5 mb-5">${esc(d.h1)}</h1>` +
        `<p class="text-navy/75 leading-relaxed mb-6">${esc(d.intro)}</p>` +
        `<a href="mailto:${EMAIL}?subject=Reel%20Make%20Support" class="text-lg font-black text-coral">${EMAIL}</a>` +
        `<div class="mt-6 ${rtl ? "text-right" : "text-left"} max-w-xl mx-auto"><h2 class="font-display font-black text-navy text-lg mb-2">${esc(d.faqTitle)}</h2>` +
        d.faq.map(([q, a]) => `<p class="text-navy/75 text-sm leading-relaxed mb-2"><b>${esc(q)}</b><br>${esc(a)}</p>`).join("") +
        `</div>` +
        `<div class="mt-8 flex flex-wrap justify-center gap-3"><a href="apps.html#reel-make" class="btn-chunky btn-chunky-coral">${esc(ui.appInfo)}</a><a href="reelmake-privacy.html" class="btn-chunky btn-chunky-ocean">${esc(ui.privacy)}</a><a href="reelmake-terms.html" class="btn-chunky btn-chunky-sun">${esc(ui.terms)}</a></div>`;
    } else {
      const isTerms = page === "terms";
      const d = isTerms ? (TERMS[lang] || TERMS.en) : (PRIVACY[lang] || PRIVACY.en);
      const updatedVal = isTerms ? (TERMS_UPDATED[lang] || TERMS_UPDATED.en) : UPDATED;
      const secHtml = d.sections.map(([h, body]) => {
        let b = body;
        if (b === null) b = "<ul>" + subFor(lang).map((li) => `<li>${li}</li>`).join("") + "</ul>" + noteFor(lang);
        else b = b.replace('<a class="rm-mail">EMAIL</a>', mail);
        return `<h2>${esc(h)}</h2>${b}`;
      }).join("");
      const links = `<a href="apps.html#reel-make" class="btn-chunky btn-chunky-coral">${esc(ui.appInfo)}</a>` + (isTerms
        ? `<a href="reelmake-privacy.html" class="btn-chunky btn-chunky-ocean">${esc(ui.privacy)}</a><a href="reelmake-support.html" class="btn-chunky btn-chunky-sun">${esc(ui.support)}</a>`
        : `<a href="reelmake-terms.html" class="btn-chunky btn-chunky-ocean">${esc(ui.terms)}</a><a href="reelmake-support.html" class="btn-chunky btn-chunky-sun">${esc(ui.support)}</a>`);
      inner =
        `<div class="text-center mb-6"><img src="assets/reelmake/logo.png" alt="Reel Make" class="w-24 h-24 rounded-2xl border-2 border-navy object-cover mx-auto mb-4">` +
        `<span class="sticker sticker-coral">${esc(d.badge)}</span>` +
        `<h1 class="display-xl text-2xl md:text-4xl text-navy mt-4">${esc(d.h1)}</h1>` +
        `<p class="text-navy/60 text-sm mt-2">${esc(d.updatedLabel)}: ${updatedVal}</p></div>` +
        `<p>${d.intro}</p>` + secHtml +
        `<div class="mt-8 flex flex-wrap justify-center gap-3">${links}</div>`;
    }
    document.getElementById("rm-content").innerHTML = inner;
    // header / footer / switcher
    const navApps = document.getElementById("rm-nav-apps"); if (navApps) navApps.textContent = ui.apps;
    const foot = document.getElementById("rm-foot"); if (foot) foot.textContent = ui.footer;
    const sel = document.getElementById("rm-lang");
    if (sel && !sel.dataset.ready) {
      sel.innerHTML = LANGS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
      sel.dataset.ready = "1";
      sel.addEventListener("change", () => { localStorage.setItem("rm_lang", sel.value); build(sel.value, page); });
    }
    if (sel) sel.value = lang;
  }

  window.renderReelmake = function (page) { build(pick(), page); };
})();
