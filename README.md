# OpenCut 增强版 / OpenCut Enhanced

基于 [OpenCut](https://github.com/OpenCut-app/opencut-classic) 深度改造的网页视频编辑器，目标是把剪映（CapCut）网页端的核心能力搬过来：特效、转场、贴纸、文字动画、AI 抠像、本地语音合成、字幕识别，全部在浏览器本地完成，不上传任何素材。

An OpenCut fork rebuilt toward CapCut's web-editor feature set — effects, transitions, stickers, text animation, AI matting, local TTS, and caption recognition, all running locally in the browser.

---

## 现在有什么 / What's inside

**特效 90+ / 90+ effects**，全部 GPU 着色器实现，参数可调：

- 风格类：青橙调、反转负冲、漂白、LOMO、褪色胶片、油画、水墨、素描、热感应
- 氛围类：雾气、极光、霞光、雨窗、流星、星空、闪电、萤火虫、花瓣雨、气泡、五彩纸屑、雪花
- 玩法类：速度线、代码雨、六边马赛克、X 光、录像带跑带、霓虹边框、果冻、眩晕、四分镜像、重影、聚光灯
- 人像类：磨皮美颜（保边平滑+提亮暖肤）、暗光增强
- 调色类：色温/色调/饱和度/对比度/高光/阴影 + 33 组预设滤镜

**转场 31 个 / 31 transitions**：溶解、擦除、推拉、立方体、风车、像素擦除、闪白、旋涡、光晕渐隐等。

**贴纸 / Stickers**：emoji 29 组 455+ 枚、50 种图形（含多边形变体）、国旗、Logo。

**文字与动画 / Text & animation**：12 组样式预设（综艺花字、电影字幕、荧光绿等）、18 个动画预设（落下入场、心跳、扭动等循环动画）、逐参数关键帧。

**AI 与音频 / AI & audio**：

- AI 抠像（RMBG-1.4，逐帧实时）
- 图片一键去背景、去水印（拉普拉斯 inpainting）
- 字幕自动识别（Whisper，支持中英等多语言，一键导出 SRT）
- 文字转语音（Kokoro v1.1 中文模型，浏览器本地推理）
- 录音旁白、节拍检测自动打点

**其他 / Others**：音效/素材库支持本地文件与文件夹导入、曲线变速、蒙版、冻结帧、关键帧、多项目管理。

## 快速开始 / Quick start

前置：[Bun](https://bun.sh)、[Docker](https://docs.docker.com/get-docker/)（只跑前端可跳过 Docker）。

```bash
git clone https://github.com/Coreyshine/opencut-enhanced.git
cd opencut-enhanced
cp apps/web/.env.example apps/web/.env.local
docker compose up -d db redis serverless-redis-http
bun install
bun dev:web
```

打开 http://localhost:3000 即可。

**AI 功能说明**：AI 抠像、语音、字幕首次使用时会自动从 Hugging Face 下载模型（各 40–300MB），之后走浏览器缓存。TTS 在不支持 WebGPU 的机器上会自动降级到 wasm 推理。

## 技术结构 / Project structure

- `apps/web/` — Next.js 前端
- `apps/desktop/` — GPUI 桌面端（未启用）
- `rust/` — GPU 合成器、特效、蒙版、WASM 绑定；特效以 WGSL 编写，经 wgpu 渲染
- `docs/` — 架构文档

渲染管线在 Rust/WASM 一侧，所有特效是 WGSL 片段着色器。新增一个特效 = 写一个 wgsl + 在 pipeline 注册 + 加一条 TS 定义，三步完成。

## 已知限制 / Known limitations

- 语音合成（Kokoro）在纯 CPU 路径下较慢，建议 Chrome/Edge 走 WebGPU
- 字幕识别 Whisper 模型首次下载较大（small 档约 150MB）
- 素材库（Pexels）需要自行申请免费 API key 填入 `apps/web/.env.local`
- 大量轨道叠加时预览有性能开销（字幕逐帧文本测量是当前瓶颈）

## 许可 / License

[MIT](LICENSE)。基于 OpenCut（MIT）。

---

<details>
<summary>English</summary>

An OpenCut fork rebuilt toward CapCut's web-editor feature set. Everything runs locally in the browser — no uploads.

**Effects (90+)** — all GPU shaders with tunable parameters: grading (teal & orange, cross process, bleach bypass, faded film, LOMO), atmosphere (fog, aurora, sunset glow, rain window, meteor, twinkling stars, lightning, snow, rain, petals, bubbles, confetti, fireflies), portrait (skin-smoothing beauty, low-light boost, sharpen), stylized (oil paint, ink wash, sketch, comic, watercolor, blueprint, cross-hatch, halftone, posterize, duotone), playback (speed lines, matrix rain, hexagon pixel, VHS tracking, ghosting, dizzy, glitch), plus 33 preset filter looks.

**31 transitions** — dissolve, wipes, pushes, cube, windmill, pixel wipe, blinds, flash, clock wipe, iris, diamond, whip, shake, swirl, streaks, glitch drift, luma, ripple, and more.

**Stickers** — 29 emoji groups (455+), 50 vector shapes with polygon variants, country flags, logos.

**Text & animation** — 12 style presets (variety show, cinema subtitle, neon, fluorescent...), 18 animation presets (drop-in, heartbeat, wiggle, bounce, slides...), per-parameter keyframes.

**AI & audio** — real-time per-frame matting (RMBG-1.4), one-click background removal and watermark removal (Laplacian inpainting), Whisper caption recognition with SRT export, local TTS (Kokoro v1.1 Chinese), voiceover recording, beat detection.

**Quick start**: clone, copy `apps/web/.env.example` to `apps/web/.env.local`, run `docker compose up -d db redis serverless-redis-http`, then `bun install && bun dev:web`. Open http://localhost:3000.

AI features download models from Hugging Face on first use. Pexels stock requires a free API key in `.env.local`.

**Known limits**: TTS falls back to slow wasm without WebGPU; Whisper small is ~150MB on first download; preview gets heavy with many stacked text tracks.

[MIT](LICENSE), based on OpenCut (MIT).
</details>
