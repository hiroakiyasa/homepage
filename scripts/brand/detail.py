"""App detail pages (ja / en) in the brand style. Every section sits on a generated background."""
from brandsite import BY, STORE, CATS, DIM, tx, img, icon, bg, stores, rating
from home import head, checks
from apps_content import C


def name(slug, lang):
    return BY[slug]['ja'] if lang == 'ja' else BY[slug]['en']


def shots(slug, lang):
    """Screenshot keys for the language (English store images on the English page when they exist)."""
    pref = 'shot-en-' if lang == 'en' and f'{slug}/shot-en-1' in DIM else 'shot-'
    return [f'{slug}/{pref}{k}' for k in range(1, 9) if f'{slug}/{pref}{k}' in DIM]


def path_of(slug, lang):
    page = C[slug]['page']
    return page if lang == 'ja' else 'en/' + page


def hero(slug, lang, c):
    t = tx(lang)
    a = BY[slug]
    cat = CATS[a['cat']]
    s = STORE.get(slug)
    meta = (t(f'バージョン {s["version"]}・{s["updated"].replace("-", ".")} 更新・App Store（日本）', f'Version {s["version"]}, updated {s["updated"]} (App Store Japan)') if s else '')
    fan = ''.join(f'<figure class="d-phone f{i}">{img(k + ".webp", t(f"{name(slug, lang)}の画面", f"{name(slug, lang)} screen"), eager=True)}</figure>'
                  for i, k in enumerate(shots(slug, lang)[:3]))
    home = '/' if lang == 'ja' else '/en/'
    apps = '/apps.html' if lang == 'ja' else '/en/apps.html'
    return f'''<section class="d-hero" style="--c:{cat[2]}">{bg(c["bg"], True)}<div class="br-wrap d-hero-grid">
<div class="d-copy"><nav class="crumbs" aria-label="{t("パンくず", "Breadcrumb")}"><a href="{home}">{t("ホーム", "Home")}</a> / <a href="{apps}">{t("アプリ", "Apps")}</a> / <span>{name(slug, lang)}</span></nav>
<div class="d-id">{icon(slug, lang, "d-icon", True)}<div><small style="color:{cat[2]}">{cat[0] if lang == "ja" else cat[1]}</small><h1>{name(slug, lang)}</h1>{rating(slug, lang) if s else ""}</div></div>
<p class="d-catch">{c[lang]["catch"]}</p><p class="lead">{c[lang]["lead"]}</p>{stores(slug, lang, "detail-hero")}<p class="fine">{meta}</p></div>
<div class="d-fan">{fan}</div></div></section>'''


def features(slug, lang, c):
    t = tx(lang)
    cards = ''.join(f'<article><span class="no">{i:02d}</span><h3>{h}</h3><p>{p}</p></article>' for i, (h, p) in enumerate(c[lang]['features'], 1))
    return f'''<section class="sec d-features">{bg("dawn")}<div class="br-wrap">{head(t("できること", "What it does"), t(f"{name(slug, lang)}で、<mark>できること</mark>。", f"What <mark>{name(slug, lang)}</mark> does."), "", True)}
<div class="feat-grid">{cards}</div></div></section>'''


def gallery(slug, lang, c):
    t = tx(lang)
    keys = shots(slug, lang)
    if len(keys) < 2:
        return ''
    figs = ''.join(f'<figure>{img(k + ".webp", t(f"{name(slug, lang)}の画面 {i}", f"{name(slug, lang)} screen {i}"))}</figure>' for i, k in enumerate(keys, 1))
    note = t('App Store に掲載している画面です。', 'Screens from the App Store listing.')
    return f'''<section class="sec d-gallery veil">{bg(c["section_bg"], cls="bg flip")}<div class="br-wrap">{head(t("画面", "Screens"), t("アプリの中を、<mark>のぞいてみる</mark>。", "A look <mark>inside the app</mark>."), "", True)}
<div class="gal" tabindex="0" aria-label="{t("画面の一覧（横にスクロール）", "Screens (scroll sideways)")}">{figs}</div><p class="note center">{note}</p></div></section>'''


def usage(slug, lang, c):
    t = tx(lang)
    L = c[lang]
    steps = ''
    if L['steps']:
        steps = '<div><h3 class="mini-h">' + t('使い方', 'How it works') + '</h3><ol class="steps">' + ''.join(
            f'<li><b>{i}</b><div><strong>{h}</strong><p>{p}</p></div></li>' for i, (h, p) in enumerate(L['steps'], 1)) + '</ol></div>'
    whom = f'<div><h3 class="mini-h">{t("こんな方に", "Made for")}</h3>{checks(L["for_whom"])}</div>'
    return f'''<section class="sec d-usage veil">{bg("kites")}<div class="br-wrap"><div class="paper usage-grid{" one" if not steps else ""}">{steps}{whom}</div></div></section>'''


def info(slug, lang, c):
    t = tx(lang)
    L = c[lang]
    labels = {'privacy': t('プライバシーポリシー', 'Privacy policy'), 'terms': t('利用規約', 'Terms of use'), 'support': t('サポート', 'Support')}
    seen = {h for h, _ in L['links']}
    legal = ''.join(f'<a class="pill-link" href="{h}">{labels[k]}</a>' for k, h in BY[slug]['legal'].items() if h not in seen)
    links = ''.join(f'<a class="pill-link" href="{h}">{x}</a>' for h, x in L['links'])
    notes = ''.join(f'<li>{n}</li>' for n in L['notes'])
    return f'''<section class="sec d-info veil">{bg("mailbox")}<div class="br-wrap narrow"><div class="paper">
<h2 class="mini-h">{t("料金について", "Pricing")}</h2><p>{L["pricing"]}</p>
{f'<h2 class="mini-h">{t("ご注意", "Good to know")}</h2><ul class="notes">{notes}</ul>' if notes else ""}
<h2 class="mini-h">{t("リンク", "Links")}</h2><div class="pill-links">{links}{legal}</div>
<p class="fine">{t("ダウンロードは無料です。価格・内容はアプリの購入画面が優先されます。", "Free to download. The in-app purchase screen shows current prices and terms.")}</p></div></div></section>'''


def others(slug, lang):
    t = tx(lang)
    pool = [s for s in ['quest', 'mochi', 'car-concierge', 'reelmake', 'voicelink', 'buddytalk'] if s != slug][:3]
    cards = ''
    for s in pool:
        a = BY[s]
        cat = CATS[a['cat']]
        href = a['detail'] if lang == 'ja' or s == 'quest' else ('/en/' + C[s]['page'] if s in C and 'en' in C[s] else '/en/apps.html#' + s)
        cards += (f'<a class="mini" href="{href}" style="--c:{cat[2]}">{icon(s, lang, "mini-icon")}<span><small>{cat[0] if lang == "ja" else cat[1]}</small>'
                  f'<strong>{name(s, lang)}</strong>{rating(s, lang) if a["status"] == "live" else ""}</span><p>{a["tag_ja"] if lang == "ja" else a["tag_en"]}</p></a>')
    apps = '/apps.html' if lang == 'ja' else '/en/apps.html'
    return f'''<section class="sec more veil">{bg("shelf")}<div class="br-wrap">{head(t("ほかのアプリ", "More from TrailFusion"), t("こちらも、<mark>どうぞ</mark>。", "You may <mark>also like</mark>."), "", True)}
<div class="mini-grid">{cards}</div><p class="center"><a class="btn btn-sub" href="{apps}">{t("すべてのアプリ", "All apps")} →</a></p></div></section>'''


def closing(slug, lang, c):
    t = tx(lang)
    return f'''<section class="closing">{bg(c["bg"])}<div class="br-wrap"><div class="closing-card">{icon(slug, lang, "closing-icon")}
<h2>{t(f"{name(slug, lang)}を、<br>はじめてみよう。", f"Try<br>{name(slug, lang)}.")}</h2><p>{t("ダウンロードは無料です。", "Free to download.")}</p>{stores(slug, lang, "detail-closing")}</div></div></section>'''


def body(slug, lang):
    c = C[slug]
    return hero(slug, lang, c) + features(slug, lang, c) + gallery(slug, lang, c) + usage(slug, lang, c) + info(slug, lang, c) + others(slug, lang) + closing(slug, lang, c)


def meta(slug, lang):
    c = C[slug][lang]
    plain = c['catch'].replace('<br>', '').replace('<mark>', '').replace('</mark>', '')
    title = f'{name(slug, lang)}｜{plain}｜TrailFusion AI' if lang == 'ja' else f'{name(slug, lang)} | {plain} | TrailFusion AI'
    return title, c['lead']
