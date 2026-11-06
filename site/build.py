#!/usr/bin/env python3
"""Standalone Brain introduction. No app build, dependencies or env files."""
import argparse, html, json, shutil
from pathlib import Path
H=html.escape

def build(repo,out):
 cfg=json.loads((repo/'site/project.json').read_text()); content=json.loads((repo/'site/content.json').read_text());out.mkdir(parents=True,exist_ok=True);(out/'media').mkdir(exist_ok=True)
 for f in ['style.css','demo.js']: shutil.copy(repo/'site'/f,out/f)
 shutil.copy(repo/'docs/readme/assets/frankie.svg',out/'media/signature.svg')
 shutil.copy(repo/'docs/readme/banner.png',out/'media/banner.png')
 for name in ['modules.png','schulte-current.png','grid-current.png','math-current.png','replay-current.png','demo.gif']:shutil.copy(repo/'site/assets'/name,out/'media'/name)
 (out/'.nojekyll').touch()
 for lang,c in content.items():
  zh=lang=='zh'; pre='../' if zh else './'; dest=out/'zh' if zh else out;dest.mkdir(exist_ok=True)
  rows=lambda items:''.join(f'<article><h3>{H(a)}</h3><p>{H(b)}</p></article>' for a,b in items)
  caps= [('modules.png','Choose Schulte Grid or Quick Math.','选择舒尔特方格或 Quick Math。'),('schulte-current.png','Default and Gorbov presets, with Advanced settings.','默认与 Gorbov 预设，以及高级设置。'),('math-current.png','Quick Math: enter the missing number.','Quick Math：输入缺失的数字。'),('replay-current.png','Replay from a walkthrough round; the duration is not a benchmark.','操作演示练习的回放，用时并非性能参考。')]
  gallery=''.join(f'<figure><a href="{pre}media/{a}"><img src="{pre}media/{a}" alt="{H(z if zh else e)}" loading="lazy" width="1468" height="1247"></a><figcaption>{H(z if zh else e)}</figcaption></figure>' for a,e,z in caps)
  strings={k:c[k] for k in ['next','done','wrong','correct']}
  head=c['headline'].split('\n')
  body=f'''<!doctype html><html lang="{'zh-CN' if zh else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Frankie Brain | {'视觉搜索与心算' if zh else 'Visual search & mental math'}</title><meta name="description" content="{H(c['intro'])}"><link rel="stylesheet" href="{pre}style.css"><link rel="canonical" href="{cfg['pages_url']+('zh/' if zh else '')}"><link rel="alternate" hreflang="en" href="{cfg['pages_url']}"><link rel="alternate" hreflang="zh-CN" href="{cfg['pages_url']}zh/"><meta name="theme-color" content="#F4F4F4"><meta property="og:type" content="website"><meta property="og:url" content="{cfg['pages_url']+('zh/' if zh else '')}"><meta property="og:image" content="{cfg['pages_url']}media/banner.png"><meta property="og:title" content="Frankie Brain"><meta property="og:description" content="{H(c['intro'])}"></head><body>
<a class="skip" href="#main">{'跳至内容' if zh else 'Skip to content'}</a><header class="shell"><a class="brand" href="{pre}" aria-label="Frankie Brain, web edition"><img src="{pre}media/signature.svg" width="100" height="42" alt="Frankie"><strong>BRAIN</strong><span>WEB</span></a><nav aria-label="{'页面导航' if zh else 'Page navigation'}"><a href="#games">{c['nav_concept']}</a><a href="#use">{c['nav_use']}</a><a href="#screens">{c['nav_screens']}</a><a href="{pre}" lang="en" {'aria-current="page"' if not zh else ''}>EN</a><a href="{pre}zh/" lang="zh-CN" {'aria-current="page"' if zh else ''}>中文</a></nav></header>
<main id="main" class="shell"><section class="hero"><div><p class="eyebrow">SCHULTE GRID / QUICK MATH</p><h1>{H(head[0])}<br>{H(head[1])}</h1><p class="intro">{H(c['intro'])}</p><div class="actions"><a class="button" href="{cfg['app_url']}">{H(c['open'])} ↗</a><a href="#demo">{H(c['try'])} ↓</a></div></div><figure class="hero-screen"><img src="{pre}media/grid-current.png" alt="{'当前应用的 3×3 方格界面' if zh else 'A 3 by 3 round in the current app'}" width="1468" height="1247" fetchpriority="high"></figure></section>
<section id="games" class="section concept"><div><h2>{H(c['concept_title'])}</h2><p class="lead">{H(c['concept'])}</p><div class="feature-list">{rows(c['features'])}</div></div><div class="demo-panel" id="demo"><div class="demo-header"><h3>{H(c['demo_title'])}</h3><button id="reset" type="button">{H(c['reset'])}</button></div><p id="status" aria-live="polite">{H(c['next'])} 1</p><div id="grid" class="grid" aria-label="{'舒尔特介绍演示' if zh else 'Schulte introduction demo'}"></div><noscript><p>{'演示需要 JavaScript。完整应用入口位于页面顶部。' if zh else 'Enable JavaScript for the demo. The full app is linked above.'}</p></noscript><p class="small">{H(c['demo_note'])}</p></div></section>
<section class="section math"><div><h2>{H(c['math_title'])}</h2><p class="lead">{H(c['math_intro'])}</p><p>{H(c['math_note'])}</p></div><div class="math-sheet"><div class="equations">{''.join('<p>'+H(x)+'</p>' for x in c['math_examples'])}</div><dl>{''.join('<div><dt>'+H(a)+'</dt><dd>'+H(b)+'</dd></div>' for a,b in c['math_difficulty'])}</dl></div></section>
<section class="section"><h2>{H(c['review_title'])}</h2><p class="lead narrow">{H(c['review_intro'])}</p><div class="review">{rows(c['review'])}</div></section>
<section id="use" class="section"><h2>{H(c['workflow_title'])}</h2><ol class="steps">{''.join('<li><h3>'+H(a)+'</h3><p>'+H(b)+'</p></li>' for a,b in c['steps'])}</ol></section>
<section id="screens" class="section"><h2>{H(c['gallery_title'])}</h2><p>{H(c['gallery_intro'])}</p><div class="gallery">{gallery}</div><details><summary>{'播放模块与设置的真实操作动图' if zh else 'Play the recorded module-to-settings walkthrough'}</summary><img src="{pre}media/demo.gif" alt="{'真实界面操作录制，压缩并调整播放速度' if zh else 'Actual app frames, compressed and retimed for a short walkthrough'}" loading="lazy"></details></section>
<section id="start" class="section runtime"><div><h2>{H(c['start_title'])}</h2><p>{H(c['runtime'])}</p><p class="small">{c['research']}</p></div><div><h3>{H(c['local'])}</h3><pre><code>npm ci\nnpm run dev</code></pre><p class="small">{H(c['local_note'])}</p><h3>{H(c['family'])}</h3><p>{H(c['family_note'])}</p><a href="https://songhaifan.github.io/frankie-brain-ios/">{H(c['family_link'])} ↗</a></div></section></main>
<footer class="shell"><a href="https://github.com/SonghaiFan"><img src="{pre}media/signature.svg" width="90" height="38" alt="Frankie"></a><span>{H(c['footer'])}</span><div><a href="https://github.com/{cfg['repository']}">{H(c['source'])}</a><a href="https://github.com/{cfg['repository']}/blob/main/site/GUIDE.md">{H(c['maintain'])}</a></div></footer><script id="demo-text" type="application/json">{json.dumps(strings,ensure_ascii=False)}</script><script src="{pre}demo.js" defer></script></body></html>'''
  (dest/'index.html').write_text(body)
 print(out)
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--out',default='_site');args=ap.parse_args();build(Path(__file__).resolve().parents[1],Path(args.out).resolve())
