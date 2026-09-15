from __future__ import annotations

from pathlib import Path
import base64
import re
import subprocess

BASE_COMMIT = "b8c922f00f90f1e443b02253dd78d5f60b2de53d"
MARKER = "2026-09-16 hotfix: original TrailFusion lockup and vehicle-app screenshots"

old_index = subprocess.check_output(
    ["git", "show", f"{BASE_COMMIT}:index.html"],
    text=True,
)
match = re.search(
    r'<img src="data:image/webp;base64,([^\"]+)" alt="TrailFusion AI" class="lockup">',
    old_index,
)
if not match:
    raise SystemExit("Original TrailFusion lockup was not found in the backup commit.")

logo_bytes = base64.b64decode(match.group(1), validate=True)
if len(logo_bytes) < 10_000 or logo_bytes[:4] != b"RIFF" or logo_bytes[8:12] != b"WEBP":
    raise SystemExit("Extracted logo is not the expected WebP asset.")

logo_path = Path("assets/icons/trailfusion-lockup.webp")
logo_path.parent.mkdir(parents=True, exist_ok=True)
logo_path.write_bytes(logo_bytes)

css_path = Path("assets/css/site-v2.css")
css = css_path.read_text(encoding="utf-8")
hotfix = r'''

/* 2026-09-16 hotfix: original TrailFusion lockup and vehicle-app screenshots */
.tf-brand{
  position:relative;
  display:inline-flex;
  align-items:center;
  gap:0!important;
  min-width:81px;
  font-size:0!important;
  line-height:1;
  letter-spacing:0!important;
}
.tf-brand::before{
  content:"";
  display:block;
  width:81px;
  height:50px;
  flex:0 0 auto;
  background:url('/assets/icons/trailfusion-lockup.webp') center/contain no-repeat;
}
.tf-brand-mark{display:none!important}
.tf-footer .tf-brand::before{width:110px;height:68px}
@media(max-width:760px){
  .tf-brand{min-width:68px}
  .tf-brand::before{width:68px;height:42px}
  .tf-footer .tf-brand::before{width:94px;height:58px}
  .tf-header:has(.tf-extra) .tf-brand{min-width:58px}
  .tf-header:has(.tf-extra) .tf-brand::before{width:58px;height:36px}
}

/* Preserve portrait proportions without letting screenshots dominate a phone viewport. */
.tf-legacy .why-pic{align-items:flex-start!important}
.tf-legacy .why-pic figure{min-width:0!important}
.tf-legacy .why-pic img{
  display:block!important;
  width:auto!important;
  height:auto!important;
  max-width:100%!important;
  max-height:440px!important;
  margin-inline:auto!important;
  object-fit:contain!important;
  transform:none!important;
}
@media(max-width:760px){
  .tf-legacy .why-pic{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:12px!important;
    justify-items:center!important;
    align-items:start!important;
  }
  .tf-legacy .why-pic figure{
    width:100%!important;
    max-width:none!important;
  }
  .tf-legacy .why-pic img{
    width:auto!important;
    height:min(48vh,320px)!important;
    max-width:100%!important;
    max-height:320px!important;
  }
  .tf-legacy .chero .shots{
    display:flex!important;
    justify-content:center!important;
    align-items:flex-end!important;
    gap:12px!important;
    flex-wrap:nowrap!important;
  }
  .tf-legacy .chero .shots img{
    display:block!important;
    width:auto!important;
    height:min(48vh,320px)!important;
    max-width:calc(50% - 8px)!important;
    max-height:320px!important;
    object-fit:contain!important;
  }
  .tf-legacy .chero .shots img:nth-child(2){transform:translateY(-8px)!important}
  .tf-legacy .chero .shots img:nth-child(3){display:none!important}
}
'''

if MARKER not in css:
    css_path.write_text(css + hotfix, encoding="utf-8")

final_css = css_path.read_text(encoding="utf-8")
for token in (
    MARKER,
    "trailfusion-lockup.webp",
    ".tf-legacy .why-pic",
    ".tf-legacy .chero .shots",
):
    if token not in final_css:
        raise SystemExit(f"Missing CSS token: {token}")

if logo_path.stat().st_size != len(logo_bytes):
    raise SystemExit("Logo write verification failed.")

print({"logo_bytes": len(logo_bytes), "css_bytes": css_path.stat().st_size})
