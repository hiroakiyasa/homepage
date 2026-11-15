"""English audience: create, translate and learn languages.

2026-11-15 user direction. Japanese Quest is the Japanese-learning course in
Gokaku Quest. English Quest is its English-learning course too. Keep Japanese
site copy and hobby pages intact.
"""
from brandsite import BASE, BY, CATS, DIM, esc, icon, img, bg, stores
from home import head, checks, qimg

PRIMARY = ['reelmake', 'voicelink', 'japanese-quest', 'english-quest', 'buddytalk']
EXTRAS = ['word-blaster', 'wood-golem', 'hacking-timer']
APP = {
    'reelmake': dict(name='Reel Make', cat='create', source='reelmake', path='/en/reelmake.html',
                    tag='Turn your photos into a reel with narration, captions and music.', label='Create videos'),
    'voicelink': dict(name='VoiceLink AI Translator', cat='connect', source='voicelink', path='/en/voicelink.html',
                     tag='Translate conversations on your iPhone or iPad, even offline after setup.', label='Translate conversations'),
    'japanese-quest': dict(name='Japanese Quest', cat='learn', source='quest', path='/en/japanese-quest.html',
                          tag='Learn everyday Japanese and practise for JLPT and JFT-Basic with quizzes and illustrated guides.', label='Learn Japanese'),
    'english-quest': dict(name='English Quest', cat='learn', source='quest', path='/en/eigo-quest.html',
                         tag='Build English vocabulary, grammar and practical conversation skills with quizzes and illustrated guides.', label='Build your English'),
    'buddytalk': dict(name='BuddyTalk', cat='learn', source='buddytalk', path='/en/buddytalk.html',
                     tag='Start with a short reply. Practise English with one or two AI conversation partners.', label='Practise speaking'),
}
for slug in EXTRAS:
    a = BY[slug]
    APP[slug] = dict(name=a['en'], cat=a['cat'], source=slug, path='/en/' + a['detail'].lstrip('/'),
                     tag=a['tag_en'], label=CATS[a['cat']][1])

FAQ = [
    ('Which app should I try first?', 'Choose Reel Make to create a narrated video, VoiceLink AI Translator to translate a conversation, Japanese Quest to learn Japanese, English Quest for vocabulary and grammar, or BuddyTalk to practise speaking English.'),
    ('Are Japanese Quest and English Quest separate downloads?', 'Both are language-learning courses inside Gokaku Quest. Download Gokaku Quest, then choose Japanese or English in the app. The store name may vary by region.'),
    ('Can I use these apps in English?', 'These apps offer English or multilingual features. The learning language and the language of explanations are different: Japanese Quest teaches Japanese, while English Quest and BuddyTalk teach English. Check each app for supported languages and devices.'),
    ('Are the apps free?', 'The apps are free to download. Some features and learning content require in-app purchases. VoiceLink Pro is a one-time purchase; Reel Make and BuddyTalk offer subscriptions. Check the purchase screen for current prices and terms.'),
    ('Who makes the apps?', 'TrailFusion AI is an independent app studio run by Hiroaki Yuasa. The App Store publisher name is hiroaki yuasa. For help, email trailfusionai@gmail.com.'),
]


def nav():
    return ''.join(f'<a href="{href}">{label}</a>' for href, label in [
        ('/en/apps.html', 'Apps'), ('/en/reelmake.html', 'Create'),
        ('/en/voicelink.html', 'Translate'), ('/en/#learn', 'Learn'), ('/en/#maker', 'About')])


def footer_apps():
    return ''.join(f'<li><a href="{APP[s]["path"]}">{APP[s]["name"]}</a></li>' for s in PRIMARY)


def schema():
    out, seen = [], set()
    for slug in PRIMARY + EXTRAS:
        a = APP[slug]
        source = BY[a['source']]
        if a['source'] in seen:
            continue
        seen.add(a['source'])
        out.append({
            '@type': 'MobileApplication',
            'name': 'Gokaku Quest' if source['slug'] == 'quest' else a['name'],
            'description': 'Japanese Quest and English Quest are language-learning courses in Gokaku Quest. One download, then choose Japanese or English.' if source['slug'] == 'quest' else a['tag'],
            'url': BASE + a['path'],
            'operatingSystem': 'iOS, Android' if source['android'] and slug != 'reelmake' else 'iOS',
            'applicationCategory': 'EducationalApplication' if a['cat'] == 'learn' else 'GameApplication' if a['cat'] == 'play' else 'UtilitiesApplication',
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
            'publisher': {'@id': BASE + '/#org'},
            'downloadUrl': f'https://apps.apple.com/app/id{source["ios"]}',
        })
        if source['slug'] == 'quest':
            out[-1]['hasPart'] = [{'@type': 'LearningResource', 'name': APP[k]['name'], 'description': APP[k]['tag'], 'url': BASE + APP[k]['path']} for k in ('japanese-quest', 'english-quest')]
    return out


def faq_schema():
    return [{'@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]


def shot(slug, n=1, eager=False):
    source = APP[slug]['source']
    if slug in ('japanese-quest', 'english-quest'):
        return qimg('japanese-everyday-atlas' if slug == 'japanese-quest' else 'english-travel-atlas', 'Japanese-learning illustrated guide in Gokaku Quest' if slug == 'japanese-quest' else 'English-learning illustrated guide in Gokaku Quest', eager=eager)
    prefix = 'shot-en-' if f'{source}/shot-en-1' in DIM else 'shot-'
    return img(f'{source}/{prefix}{n}.webp', f'{APP[slug]["name"]} app screen', eager=eager)


def card(slug, gallery=False, compact=False):
    a = APP[slug]
    note = '<p class="fine">A language-learning course in Gokaku Quest.</p>' if a['source'] == 'quest' else ''
    visual = f'<figure class="global-card-screen">{shot(slug)}</figure>' if gallery else ''
    download = '' if compact else stores(a['source'], 'en', 'global-catalog', True)
    links = ''.join(f'<a href="{h}">{k.title()}</a>' for k, h in BY[a['source']]['legal'].items())
    legal = '' if compact else f'<div class="app-links">{links}</div>'
    return f'''<article class="app-card global-card" id="{slug}" data-cat="{a["cat"]}" data-product="{a["source"]}">
<div class="app-card-top">{icon(a["source"], "en", "card-icon")}<div><small>{a["label"]}</small><h3><a href="{a["path"]}">{a["name"]}</a></h3></div></div>
{visual}<p>{a["tag"]}</p>{note}<a class="text-link" href="{a["path"]}">Explore {a["name"]} →</a>{download}{legal}</article>'''


def hero():
    pair = ''.join(f'''<a class="global-hero-app" href="{APP[s]["path"]}">
<div class="global-hero-id">{icon(s, "en", "spot-icon", True)}<div><span>{APP[s]["label"]}</span><strong>{APP[s]["name"]}</strong></div></div>
<figure>{shot(s, eager=True)}</figure><span class="global-hero-go">Explore the app →</span></a>''' for s in ['reelmake', 'voicelink'])
    return f'''<section class="hero global-hero">{bg("hero", True)}<div class="br-wrap global-hero-grid">
<div class="hero-copy"><span class="tag">Small adventures for every day.</span><h1>Create. Translate.<br><mark>Keep learning.</mark></h1>
<p class="lead">Make a video worth sharing. Find the words for a conversation. Take the next step in Japanese or English. Meet the apps from TrailFusion AI.</p>
<div class="actions"><a class="btn btn-main" href="/en/reelmake.html">Explore Reel Make →</a><a class="btn btn-sub" href="/en/voicelink.html">Try VoiceLink</a></div>
<p class="global-hero-learn"><a href="#learn">Japanese Quest · English Quest · BuddyTalk ↓</a></p></div>
<div class="global-hero-pair">{pair}</div></div></section>'''


def featured():
    records = [
        ('reelmake', 'studio', 'Your photos.<br><mark>Your next reel.</mark>',
         'For a shop, a creative project or a travel memory: choose photos and short clips, then let Reel Make build the script, narration, captions and cuts.',
         ['Preview multilingual voices before exporting', 'Create vertical videos for social media', 'Start with a free video up to 30 seconds'],
         'Paid plans offer longer videos and additional features. Social posting is optional and requires connecting your account.'),
        ('voicelink', 'world', 'A conversation,<br><mark>across languages.</mark>',
         'See what was said and what it means, side by side. VoiceLink AI Translator handles speech recognition and translation on your iPhone or iPad.',
         ['20 translation languages', 'Works offline after the language models are downloaded', 'No account or ads. Pro is a one-time purchase'],
         'Requires a compatible iPhone or iPad. Some Pro features need newer OS versions or Apple Intelligence; see the app page.'),
    ]
    out = ''
    for i, (slug, backdrop, title, lead, points, note) in enumerate(records):
        a = APP[slug]
        photos = ''.join(f'<figure class="shot s{k}">{shot(slug, k)}</figure>' for k in (1, 2, 3))
        out += f'''<article class="spot{" flip" if i else ""}" id="featured-{slug}">{bg(backdrop)}
<div class="spot-copy"><p class="spot-app">{icon(slug, "en", "spot-icon")}<span><small>{a["label"]}</small><strong>{a["name"]}</strong></span></p>
<h3>{title}</h3><p>{lead}</p>{checks(points)}{stores(slug, "en", "global-featured", True)}
<a class="text-link" href="{a["path"]}">See how {a["name"]} works →</a><p class="fine">{note}</p></div><div class="spot-shots">{photos}</div></article>'''
    return f'''<section class="sec spots veil" id="create-and-translate">{bg("dawn")}
{head("Create & translate", "More to say.<br><mark>More ways to share it.</mark>", "Two apps to turn your ideas and conversations into something useful.", True)}
<div class="br-wrap">{out}</div></section>'''


def learn():
    cards = ''.join(card(s, gallery=True, compact=True) for s in ['japanese-quest', 'english-quest', 'buddytalk'])
    return f'''<section class="sec veil global-learn" id="learn">{bg("library")}<div class="br-wrap">
{head("Language learning", "Learn Japanese.<br><mark>Build your English.</mark>", "Choose a language, work on a skill, and make a little progress each day.", True)}
<div class="app-grid global-language-grid">{cards}</div>
<p class="note center">Japanese Quest and English Quest are language-learning courses in Gokaku Quest. One download, then choose Japanese or English.</p>
</div></section>'''


def trust():
    cards = [
        ('01', 'See the real app', 'The screens and learning samples on these pages come from our apps. Each app page explains what it does and how to start.'),
        ('02', 'Choose how to begin', 'Start with the free features, then decide whether a paid feature fits your needs. Current prices and purchase terms are shown before you buy.'),
        ('03', 'Know how your data is used', 'Read the app-specific privacy policy. VoiceLink processes conversations on your device; apps with cloud AI explain their data use and consent choices.'),
    ]
    body = ''.join(f'<article><span class="no">{n}</span><h3>{title}</h3><div>{text}</div></article>' for n, title, text in cards)
    return f'''<section class="sec trust veil">{bg("planes")}<div class="br-wrap">
{head("Made with care", "Useful tools.<br><mark>Clear choices.</mark>", "", True)}<div class="trust-grid three">{body}</div></div></section>'''


def maker():
    return f'''<section class="sec maker veil" id="maker">{bg("desk")}<div class="br-wrap narrow">
{head("The studio", "Everyday curiosity.<br><mark>Apps you can use.</mark>", "TrailFusion AI is an independent studio making apps for creating, communicating and learning. Real everyday needs become small, practical tools.")}
<p>Made by Hiroaki Yuasa (Hiro). You will see <strong>hiroaki yuasa</strong> as the publisher on the App Store.</p>
<div class="actions"><a class="btn btn-sub" href="/about/">About the maker (Japanese) →</a><a class="btn btn-sub" href="mailto:trailfusionai@gmail.com">Contact TrailFusion AI</a></div></div></section>'''


def faq():
    rows = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)
    return f'''<section class="sec faq-sec veil">{bg("mailbox")}<div class="br-wrap narrow">{head("FAQ", "Find your <mark>first app.</mark>", "", True)}<div class="faq">{rows}</div></div></section>'''


def closing():
    return f'''<section class="closing">{bg("hero")}<div class="br-wrap"><div class="closing-card">
<h2>What would you like<br><mark>to do today?</mark></h2><p>Create a reel, translate a conversation or learn a language.</p>
<div class="actions center"><a class="btn btn-main" href="/en/reelmake.html">Create with Reel Make →</a><a class="btn btn-sub" href="/en/voicelink.html">Translate with VoiceLink</a><a class="btn btn-sub" href="/en/#learn">Explore language learning</a></div>
<p class="fine">Free downloads with optional in-app purchases. Features and availability vary by app, device and region.</p></div></div></section>'''


def home_body():
    return hero() + featured() + learn() + trust() + maker() + faq() + closing()


def catalog_body():
    main = ''.join(card(s, gallery=False) for s in PRIMARY + EXTRAS)
    cats = [('all', 'All'), ('create', 'Create'), ('connect', 'Translate'), ('learn', 'Learn'), ('play', 'Play'), ('focus', 'Focus')]
    chips = ''.join(f'<button type="button" class="chip" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{label}</button>' for k, label in cats)
    return f'''<section class="page-hero">{bg("shelf", True)}<div class="br-wrap"><span class="tag">Apps by TrailFusion AI</span>
<h1>Create. Translate.<br><mark>Learn something new.</mark></h1>
<p class="lead">Explore Reel Make, VoiceLink AI Translator, Japanese Quest, English Quest and BuddyTalk. Find the app for your next creative project, conversation or learning goal.</p>
<div class="chips" role="group" aria-label="Filter by category" hidden>{chips}</div></div></section>
<section class="sec catalog veil">{bg("dawn")}<div class="br-wrap"><div class="app-grid">{main}</div><p class="note" data-count aria-live="polite"></p>
<p class="note">Japanese Quest and English Quest are courses in Gokaku Quest. Download it, then choose your learning language. The apps are free to download with optional in-app purchases. Check the store and purchase screen for current device, language and plan details.</p></div></section>'''


def related(slug):
    selected = [s for s in PRIMARY if APP[s]['source'] != slug]
    if slug in ('reelmake', 'voicelink'):
        selected = [s for s in ['voicelink', 'reelmake', 'japanese-quest', 'english-quest', 'buddytalk'] if APP[s]['source'] != slug]
    else:
        selected = [s for s in ['japanese-quest', 'english-quest', 'buddytalk', 'reelmake', 'voicelink'] if APP[s]['source'] != slug]
    cards = ''.join(card(s, compact=True) for s in selected[:3])
    return f'''<section class="sec more veil">{bg("shelf")}<div class="br-wrap">
{head("More from TrailFusion AI", "Keep creating.<br><mark>Keep learning.</mark>", "", True)}<div class="app-grid">{cards}</div>
<p class="center"><a class="btn btn-sub" href="/en/apps.html">Explore all apps →</a></p></div></section>'''


def japanese_body():
    points = [('Everyday Japanese', 'Build vocabulary and expressions for introductions, shopping, travel and daily life.'),
              ('JLPT & JFT-Basic practice', 'Choose Japanese-learning tracks and review vocabulary, grammar and reading through short quizzes.'),
              ('Illustrated learning guides', 'Use visual explanations alongside questions, then come back to what you want to practise.')]
    features = ''.join(f'<article><span class="no">{i:02d}</span><h3>{title}</h3><p>{text}</p></article>' for i, (title, text) in enumerate(points, 1))
    return f'''<section class="d-hero global-japanese">{bg("library", True)}<div class="br-wrap d-hero-grid">
<div class="d-copy"><nav class="crumbs" aria-label="Breadcrumb"><a href="/en/">Home</a> / <a href="/en/#learn">Language learning</a> / Japanese Quest</nav>
<div class="d-id">{icon("quest", "en", "d-icon", True)}<div><small>Learn Japanese</small><h1>Japanese Quest</h1></div></div>
<p class="d-catch">One little step.<br><mark>More Japanese.</mark></p><p class="lead">Learn everyday Japanese and practise for JLPT and JFT-Basic with short quizzes and illustrated guides.</p>
<p><strong>The Japanese-learning course inside Gokaku Quest.</strong> Download Gokaku Quest, then choose Japanese in the app.</p>{stores("quest", "en", "japanese-hero")}
<p class="fine">Free to download. Some content and features require in-app purchases. Available content and explanation languages vary by OS and version.</p></div>
<figure class="global-atlas">{qimg("japanese-everyday-atlas", "Actual Japanese-learning illustrated guide in Gokaku Quest", eager=True)}<figcaption>A real illustrated guide from the Japanese course.</figcaption></figure></div></section>
<section class="sec d-features">{bg("dawn")}<div class="br-wrap">{head("Learn & practise", "Japanese for <mark>your next step.</mark>", "", True)}<div class="feat-grid">{features}</div></div></section>
<section class="sec d-gallery veil">{bg("library")}<div class="br-wrap narrow">{head("Inside the course", "Read. Try.<br><mark>Come back and remember.</mark>", "A sample from the Japanese-learning course.", True)}
<figure class="global-course-sample">{qimg("japanese-everyday-quiz", "Actual Japanese-learning question and explanation screen in Gokaku Quest")}</figure></div></section>
<section class="sec d-usage veil">{bg("kites")}<div class="br-wrap narrow"><div class="paper">{head("How to start", "Your first <mark>Japanese lesson.</mark>")}
<ol class="steps"><li><b>1</b><div><strong>Download Gokaku Quest</strong><p>Download Gokaku Quest, the app that includes this Japanese course. The store name may vary by region.</p></div></li>
<li><b>2</b><div><strong>Choose Japanese</strong><p>Choose the Japanese course and a learning track that suits your goal.</p></div></li>
<li><b>3</b><div><strong>Try a short quiz</strong><p>Read the explanation and use the illustrated guide to review.</p></div></li></ol>
<p class="fine">A learning aid; it does not guarantee a test result. Current content and prices are shown in the app.</p></div></div></section>
<section class="sec veil" id="english">{bg("library")}<div class="br-wrap narrow"><div class="paper">{head("English in Gokaku Quest", "Your next language,<br><mark>in the same app.</mark>", "Gokaku Quest also offers an English-learning course with vocabulary, grammar and practical conversation. Choose English in the app to explore it.")}
<p>Explore the English course in the same app. <a class="text-link" href="/en/eigo-quest.html">Explore English Quest →</a> For AI speaking practice, <a class="text-link" href="/en/buddytalk.html">meet BuddyTalk →</a>.</p></div></div></section>
{related("quest")}<section class="closing">{bg("hero")}<div class="br-wrap"><div class="closing-card"><h2>Start with<br><mark>a little Japanese.</mark></h2><p>Download Gokaku Quest and choose Japanese.</p>{stores("quest", "en", "japanese-closing")}
<div class="pill-links"><a href="/gokaku-quest-privacy.html">Privacy policy</a><a href="/gokaku-quest-terms.html">Terms of use</a><a href="/support/">Support</a></div></div></div></section>'''


def english_body():
    points = [('Vocabulary and grammar', 'Build everyday vocabulary and review grammar with short quizzes and explanations.'),
              ('Practical English', 'Learn expressions for travel, work and everyday conversations.'),
              ('Illustrated learning guides', 'Use visual explanations alongside questions, then return to what you want to practise.')]
    features = ''.join(f'<article><span class="no">{i:02d}</span><h3>{title}</h3><p>{text}</p></article>' for i, (title, text) in enumerate(points, 1))
    return f'''<section class="d-hero global-japanese">{bg("library", True)}<div class="br-wrap d-hero-grid">
<div class="d-copy"><nav class="crumbs" aria-label="Breadcrumb"><a href="/en/">Home</a> / <a href="/en/#learn">Language learning</a> / English Quest</nav>
<div class="d-id">{icon("quest", "en", "d-icon", True)}<div><small>Learn English</small><h1>English Quest</h1></div></div>
<p class="d-catch">One little step.<br><mark>More English.</mark></p><p class="lead">Build English vocabulary, grammar and practical conversation skills with quizzes and illustrated guides.</p>
<p><strong>The English-learning course inside Gokaku Quest.</strong> Download Gokaku Quest, then choose English in the app.</p>{stores("quest", "en", "english-hero")}
<p class="fine">Free to download. Some content and features require in-app purchases. Available content and explanation languages vary by OS and version.</p></div>
<figure class="global-atlas">{qimg("english-travel-atlas", "Actual English-learning illustrated guide in Gokaku Quest", eager=True)}<figcaption>A real illustrated guide from the English course, shown here with Japanese explanations.</figcaption></figure></div></section>
<section class="sec d-features">{bg("dawn")}<div class="br-wrap">{head("Learn & practise", "English for <mark>your next step.</mark>", "", True)}<div class="feat-grid">{features}</div></div></section>
<section class="sec d-usage veil">{bg("kites")}<div class="br-wrap narrow"><div class="paper">{head("How to start", "Your first <mark>English lesson.</mark>")}
<ol class="steps"><li><b>1</b><div><strong>Download Gokaku Quest</strong><p>Japanese Quest and English Quest are courses in the same app. The store name may vary by region.</p></div></li>
<li><b>2</b><div><strong>Choose English</strong><p>Choose the English course and a learning track that suits your goal.</p></div></li>
<li><b>3</b><div><strong>Try a short quiz</strong><p>Read the explanation and use the illustrated guide to review.</p></div></li></ol>
<p class="fine">A learning aid; it does not guarantee a test result. Current content and prices are shown in the app.</p></div></div></section>
<section class="sec veil">{bg("library")}<div class="br-wrap narrow"><div class="paper">{head("Keep learning", "Another language,<br><mark>in the same app.</mark>", "Gokaku Quest also includes Japanese learning for everyday life, JLPT and JFT-Basic.")}
<div class="actions"><a class="btn btn-sub" href="/en/japanese-quest.html">Explore Japanese Quest →</a><a class="btn btn-sub" href="/en/buddytalk.html">Practise speaking with BuddyTalk →</a></div></div></div></section>
{related("quest")}<section class="closing">{bg("hero")}<div class="br-wrap"><div class="closing-card"><h2>Start with<br><mark>a little English.</mark></h2><p>Download Gokaku Quest and choose English.</p>{stores("quest", "en", "english-closing")}
<div class="pill-links"><a href="/gokaku-quest-privacy.html">Privacy policy</a><a href="/gokaku-quest-terms.html">Terms of use</a><a href="/support/">Support</a></div></div></div></section>'''
