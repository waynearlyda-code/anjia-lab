#!/bin/bash
# 把 src/ 打包成一个完全离线的单文件 HTML：dist/安家Lab-户型设计器.html
cd "$(dirname "$0")"
python3 - <<'PY'
import base64, re
src = open('src/index.html', encoding='utf-8').read()
three = open('vendor/three.min.js', encoding='utf-8').read()
three = re.sub(r"^console\.warn\([^\n]*?\);", "", three, count=1)
import os
img = base64.b64encode(open('assets/plan.jpg','rb').read()).decode() if os.path.exists('assets/plan.jpg') else ''
order = ['data.js','geom.js','textures.js','furniture.js','analysis.js','view3d.js','plan2d.js','main.js']
code = "\n".join(open('src/'+f, encoding='utf-8').read() for f in order)
def pack(plan_img):
    app = "const PLAN_IMG='" + plan_img + "';\n" + code
    app = app.replace('</script', '<\\/script')
    return src.replace('<script>/*THREE*/</script>', '<script>' + three + '</script>').replace('<script>/*APP*/</script>', '<script>\n' + app + '\n</script>')
# 私人版：带原户型图（不进仓库）
if img:
    open('dist/安家Lab-户型设计器.html', 'w', encoding='utf-8').write(pack('data:image/jpeg;base64,' + img))
# 公开版：不带任何原图，开场用程序画的线稿
open('docs/index.html', 'w', encoding='utf-8').write(pack(''))
print('ok')
PY
