<p align="center">
  <img src="./assets/banner.svg" alt="npface — 12 states" width="100%" />
</p>

<h1 align="center">npface</h1>
<p align="center"><b>表情头盔 · 会表情的 AI 员工头像</b><br/>An expressive, zero-dependency SVG helmet avatar for AI agents.</p>

<p align="center">
  <a href="https://github.com/scccc6ut/npface/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/scccc6ut/npface/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/npface"><img alt="npm" src="https://img.shields.io/npm/v/npface?label=npface" /></a>
  <a href="https://www.npmjs.com/package/npface-react"><img alt="npm" src="https://img.shields.io/npm/v/npface-react?label=npface-react" /></a>
  <img alt="gzip" src="https://img.shields.io/badge/core-~9%20KB%20gzip-c7f636" />
  <img alt="deps" src="https://img.shields.io/badge/dependencies-0-0f1d3a" />
  <a href="./LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue" /></a>
</p>

<p align="center">
  <a href="https://scccc6ut.github.io/npface/"><b>Live demo →</b></a> ·
  <a href="#english">English</a> ·
  <a href="#中文">中文</a>
</p>

---

## English

### What is it?

`npface` renders a small helmet-shaped face — a deep-navy rounded square helmet, white visor slot, two neon-green rounded-square eyes (the npcrew brand mark, flat 2D) — and makes it **emote**. Expressions come entirely from the two eyes, the visor and tiny helmet motions: blinks, squint-smiles, wide eyes, side glances, sleepy half-lids, reading saccades, a radar-like "searching" circle, dizzy X-eyes, z z z, nods, head tilts, breathing.

Give it a **semantic state name** and it takes care of the rest:

```ts
face.set('thinking'); // → idle → thinking → search-docs → search-web → working → proud …
```

- **13 states**: `sleep · wake · idle · blink · happy · proud (complete) · thinking · search-docs · search-web · working · waiting · error (dizzy) · sad (tired)` — plus aliases (`searching`, `rag`, `browsing`, `tired` …; `searchDocs` / `search_docs` are normalised too), unknown names fall back to `idle`, and you can register your own.
- **Zero dependencies**, framework-agnostic core (plain SVG/DOM, built-in springs & easing, one shared `requestAnimationFrame` loop). **~9 KB gzip.**
- **React bindings** (`npface-react`): `<Npface state="working" />`. Vue can follow.
- **Alive by default**: breathing, random glances, auto-blink, per-state rhythm; optional **eyes-follow-pointer**.
- **Considerate**: pauses off-screen (IntersectionObserver), honours `prefers-reduced-motion` (static poses + minimal transitions), `role="img"` + `aria-label`.
- **Themeable**: helmet / visor / eye colours, light & dark palettes, any size.
- **Pure data states**: every expression is a data file (eye shapes + head pose + rhythm) separate from the renderer.

### Install

```bash
npm i npface            # core — vanilla / any framework
npm i npface-react      # React bindings (depends on npface)
```

CDN / no build step:

```html
<script src="https://unpkg.com/npface/dist/npface.min.js"></script>
<script>
  const face = npface.createNpface('#avatar', { state: 'idle', size: 64 });
</script>
```

### Quick start

**Vanilla**

```ts
import { createNpface } from 'npface';

const face = createNpface(document.querySelector('#avatar')!, {
  state: 'idle', // initial state (alias: emotion)
  size: 48, // px, or any CSS length string
  colors: { body: '#0f1d3a', visor: '#fff', eye: '#c7f636' },
  follow: true, // eyes follow the pointer (alias: gaze)
});

face.set('thinking'); // switch with a spring transition
face.pulse('proud'); // play once, then fall back to the previous state
face.pulse('blink'); // a single blink
face.look(0.6, -0.3); // look in a direction (-1..1); face.look(null) releases
face.follow(false);
face.destroy();
```

**React**

```tsx
import { useRef } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';

export function Employee({ status }: { status: string }) {
  const face = useRef<NpfaceHandle>(null);
  return (
    <button onClick={() => face.current?.pulse('happy')}>
      <Npface ref={face} state={status} size={48} follow />
    </button>
  );
}
```

`npface-react` is marked `"use client"` and works with Next.js App Router. Props map 1:1 to the options below; changing `state` triggers a transition. The imperative handle (`pulse`, `blink`, `look`, `follow`, `setColors`, …) is the core instance.

### API

#### `createNpface(target, options?) → Npface`

`target` is an element or CSS selector; the `<svg>` is appended to it.

| option              | type                             | default       | description                                                                                               |
| ------------------- | -------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `state` / `emotion` | `string`                         | `'idle'`      | initial state (aliases ok, unknown → `idle`)                                                              |
| `size`              | `number \| string`               | `48`          | px or CSS length (`'100%'`, `'3rem'`)                                                                     |
| `colors`            | `{ body, visor, eye, rim, zzz }` | brand palette | any subset; `rim` is an optional helmet outline                                                           |
| `theme`             | `'light' \| 'dark' \| 'auto'`    | `'auto'`      | picks the default palette (`auto` = `prefers-color-scheme`)                                               |
| `follow` / `gaze`   | `boolean`                        | `false`       | eyes (and a bit of head) follow the pointer                                                               |
| `reducedMotion`     | `boolean \| 'auto'`              | `'auto'`      | `auto` honours `prefers-reduced-motion`: no breathing / blink / gaze, quick critically-damped transitions |
| `pauseOffscreen`    | `boolean`                        | `true`        | stop animating while out of view                                                                          |
| `label`             | `string`                         | state name    | `aria-label`                                                                                              |
| `states`            | `Record<string, StateDef>`       | —             | extra / overriding states for this instance                                                               |
| `className`         | `string`                         | —             | extra classes on the `<svg>`                                                                              |
| `onChange`          | `(state, prev) => void`          | —             | after every state change                                                                                  |

#### Instance

| member                                                           | description                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `el`                                                             | the `<svg>` (`class="npface"`, `data-state="…"`)                 |
| `state`                                                          | current state name                                               |
| `set(name, { immediate? })`                                      | switch state; `immediate` snaps                                  |
| `pulse(name, ms?)`                                               | play once then return (default duration per state, else 1500 ms) |
| `blink()`                                                        | blink now                                                        |
| `follow(on)`                                                     | pointer gaze on/off                                              |
| `look(x, y)` / `look(null)`                                      | fixed gaze direction                                             |
| `setColors(partial)` · `setSize()` · `setTheme()` · `setLabel()` | runtime tweaks                                                   |
| `destroy()`                                                      | stop & remove                                                    |

Also exported: `STATES`, `STATE_NAMES`, `ALIASES`, `registerState(name, def)`, `resolveStateName()`, `BASE_EYE`, `BASE_HEAD`, `SPRINGS`, `PALETTE`, `LIGHT_COLORS`, `DARK_COLORS`, and the geometry helpers (`HELMET_PATH`, `eyePath`, …) for static rendering.

### States

| state         | look                                                    | meaning                                           | notes                                                                                              |
| ------------- | ------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `idle`        | <img src="./assets/states/idle.svg" width="72"/>        | resting                                           | breathing, random glances, auto-blink                                                              |
| `blink`       | <img src="./assets/states/blink.svg" width="72"/>       | automatic                                         | `pulse('blink')` / `blink()` for a manual one                                                      |
| `happy`       | <img src="./assets/states/happy.svg" width="72"/>       | pleased                                           | smile arches + a bounce; good as a pulse                                                           |
| `proud`       | <img src="./assets/states/proud.svg" width="72"/>       | task complete                                     | alias `complete`, `done`, `success`; chin up + nod; pulse                                          |
| `thinking`    | <img src="./assets/states/thinking.svg" width="72"/>    | reasoning                                         | eyes up, head tilt, drifting glances                                                               |
| `search-docs` | <img src="./assets/states/search-docs.svg" width="72"/> | retrieving documents (RAG, files, knowledge base) | reading saccades line by line, flick to the next page; alias `rag`, `reading`, `retrieval`, `docs` |
| `search-web`  | <img src="./assets/states/search-web.svg" width="72"/>  | web / internet search                             | round eyes circling like a radar sweep; alias `searching`, `search`, `browsing`, `web`             |
| `working`     | <img src="./assets/states/working.svg" width="72"/>     | executing                                         | focused narrow eyes scanning lines; alias `busy`                                                   |
| `waiting`     | <img src="./assets/states/waiting.svg" width="72"/>     | needs your input                                  | head cocked, one eye raised; alias `ask`, `question`                                               |
| `error`       | <img src="./assets/states/error.svg" width="72"/>       | failure / dizzy                                   | X eyes, wobble; alias `dizzy`, `fail`; pulse                                                       |
| `sad`         | <img src="./assets/states/sad.svg" width="72"/>         | tired / down                                      | droopy lids, head low; alias `tired`                                                               |
| `sleep`       | <img src="./assets/states/sleep.svg" width="72"/>       | offline / paused                                  | closed eyes, slow breath, z z z                                                                    |
| `wake`        | <img src="./assets/states/wake.svg" width="72"/>        | coming online                                     | eyes pop open, stretch, then auto → `idle`                                                         |

The previews above are animated SVGs recorded from the engine itself (`pnpm assets`); see everything move in the [live demo](https://scccc6ut.github.io/npface/).

### Customise

**Colours & theme**

```ts
createNpface(el, { theme: 'dark', colors: { eye: '#5ef2c0', rim: 'rgba(255,255,255,.15)' } });
face.setColors({ body: '#12315c' });
```

Brand palette: navy `#0f1d3a`, lime `#c7f636`, deep lime `#4c6606`, pale lime `#eff8cf`, sand `#e9ebe4`, warm white `#f6f7f2` (exported as `PALETTE`).

**Your own states** — a state is data. Eyes are parametric rounded squares: size (`w`, `h`), roundness (`r`), offset (`x`, `y`), rotation, two lids (`lidT`, `lidB`) with tilt and curvature, an X overlay (`cross`) and fill. Mirrored props are written for the left eye and flipped automatically.

```ts
import { registerState } from 'npface';

registerState('wink', { extends: 'happy', eyes: [{ lidT: 0.9 }, {}], pulse: 700 });

registerState('love', {
  eye: { r: 1, w: 16, h: 16, lidB: 0.35, curveB: 0.6 },
  head: { y: -1 },
  spring: 'bouncy',
  motions: [{ type: 'sine', target: 'head.rot', amp: 3, period: 900 }],
  sequence: {
    steps: [
      { at: 0, head: { sy: 0.95 } },
      { at: 150, head: { sy: 1 } },
    ],
  },
});

face.set('love');
```

Motion primitives: `sine`, `sweep` (scan & flick back), `wander` (random walk), `glance` (dart & return), `keys` (stepped values); plus `blink: { every, double }`, an entry `sequence`, `next` (auto-transition), `pulse` (default one-shot length) and `zzz`. See [`packages/core/src/states.ts`](./packages/core/src/states.ts) — it is the whole expression library.

### Wiring it to an AI agent

The backend only needs to emit a **state name** alongside its usual events; no animation logic server-side.

```ts
// SSE / WebSocket payload: { agentId: 'nova', status: 'search-docs' }
es.onmessage = (e) => {
  const { status, event } = JSON.parse(e.data);
  if (event === 'done') face.pulse('proud');
  else face.set(status); // thinking | search-docs | search-web | working | waiting | error | idle …
};
```

Suggested mapping: `planning → thinking`, `retrieval / RAG / file search → search-docs`, `web search / browsing → search-web`, `generating / tool_call → working`, `needs_input → waiting`, `error → error`, `finished → pulse('proud')`, `offline → sleep`, `online → wake`. Unknown names are safe (→ `idle`), so you can stream raw statuses and refine the mapping later. Names are normalised (`searchDocs`, `search_docs`, `SEARCH-DOCS` all work).

### Performance & accessibility

- One shared rAF loop for all instances; each face re-renders eye paths only when something changed and goes dormant between blinks when a state is static.
- Off-screen instances unsubscribe (IntersectionObserver); hidden tabs pause naturally.
- `prefers-reduced-motion` → static poses, no breathing/blinks/gaze, quick non-bouncy transitions.
- `role="img"` with an `aria-label` that tracks the state (or your `label`).

### Repository

```
packages/core    npface        zero-dep core (TypeScript, tsup, vitest)
packages/react   npface-react  React bindings
apps/demo        gallery / playground (Vite + React + Tailwind) → GitHub Pages / Vercel
```

```bash
pnpm install
pnpm dev          # demo with HMR against package sources
pnpm check        # lint + typecheck + build + test + size budget
pnpm assets       # re-record the README banner + animated state previews from the engine
pnpm release 0.1.0 --dry-run   # bump both packages, run checks, (dry) publish
```

### License

The helmet, eye model, state data and engine are original work, released under the **MIT license**. The helmet mark belongs to npcrew.

---

## 中文

### 这是什么？

`npface` 渲染一个小小的头盔脸——深藏青圆角正方形头盔、白色横向护目镜槽、两颗荧光绿圆角方形眼睛（npcrew 的品牌形象，纯 2D 平面），并让它**会表情**。所有表情只靠两只眼睛、护目镜和头盔的小动作：眨眼、眯眼笑、圆睁、斜眼扫视、困倦半闭、逐行扫读、雷达式"检索"转圈、晕眩 X 眼、zzz、点头、歪头、呼吸起伏。

你只需给它一个**语义状态名**，其余交给它：

```ts
face.set('thinking'); // → idle → thinking → search-docs → search-web → working → proud …
```

- **13 个状态**：`sleep · wake · idle · blink · happy · proud(complete) · thinking · search-docs(文档检索) · search-web(联网检索) · working · waiting · error(晕) · sad(tired)`，支持别名（`searching`、`rag`、`browsing`、`tired` …，`searchDocs` / `search_docs` 也会被归一化），未知状态自动回落 `idle`，也可以注册自定义状态。
- **零依赖**、框架无关的核心（直接操作 SVG/DOM，内置弹簧与缓动，全页面共用一个 `requestAnimationFrame` 循环），**gzip 约 9 KB**。
- **React 封装**（`npface-react`）：`<Npface state="working" />`，Vue 可后续补充。
- **默认就是活的**：呼吸、随机扫视、自动眨眼、每个状态自带节奏；可选**眼睛跟随鼠标**。
- **体贴**：离屏自动暂停（IntersectionObserver），尊重 `prefers-reduced-motion`（只保留静态姿态与最小切换），`role="img"` + `aria-label`。
- **可定制**：头盔 / 护目镜 / 眼睛三色可配，亮暗两套默认配色，任意尺寸。
- **状态即数据**：每个表情都是纯数据（眼形 + 头部姿态 + 节奏），与渲染逻辑分离。

### 安装

```bash
npm i npface            # 核心——原生 JS / 任意框架
npm i npface-react      # React 封装（依赖 npface）
```

CDN 直接用：

```html
<script src="https://unpkg.com/npface/dist/npface.min.js"></script>
<script>
  const face = npface.createNpface('#avatar', { state: 'idle', size: 64 });
</script>
```

### 快速开始

**原生 JS**

```ts
import { createNpface } from 'npface';

const face = createNpface(document.querySelector('#avatar')!, {
  state: 'idle', // 初始状态（别名 emotion）
  size: 48, // 像素，或任意 CSS 长度字符串
  colors: { body: '#0f1d3a', visor: '#fff', eye: '#c7f636' },
  follow: true, // 眼睛跟随鼠标（别名 gaze）
});

face.set('thinking'); // 切换状态（弹簧过渡）
face.pulse('proud'); // 一次性表情，播完回落到之前的状态
face.pulse('blink'); // 眨一下
face.look(0.6, -0.3); // 看向某个方向（-1..1）；face.look(null) 释放
face.follow(false);
face.destroy();
```

**React**

```tsx
import { useRef } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';

export function Employee({ status }: { status: string }) {
  const face = useRef<NpfaceHandle>(null);
  return (
    <button onClick={() => face.current?.pulse('happy')}>
      <Npface ref={face} state={status} size={48} follow />
    </button>
  );
}
```

`npface-react` 已标记 `"use client"`，可直接用于 Next.js App Router。props 与下面的选项一一对应；`state` 变化即触发过渡；ref 拿到的就是核心实例（`pulse`、`blink`、`look`、`follow`、`setColors` …）。

### API

#### `createNpface(target, options?) → Npface`

`target` 是元素或 CSS 选择器，`<svg>` 会被追加进去。

| 选项                | 类型                             | 默认     | 说明                                                                     |
| ------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------ |
| `state` / `emotion` | `string`                         | `'idle'` | 初始状态（支持别名，未知 → `idle`）                                      |
| `size`              | `number \| string`               | `48`     | 像素或 CSS 长度（`'100%'`、`'3rem'`）                                    |
| `colors`            | `{ body, visor, eye, rim, zzz }` | 品牌配色 | 任意子集；`rim` 为可选的头盔描边                                         |
| `theme`             | `'light' \| 'dark' \| 'auto'`    | `'auto'` | 选择默认配色（`auto` 跟随 `prefers-color-scheme`）                       |
| `follow` / `gaze`   | `boolean`                        | `false`  | 眼睛（带一点头部）跟随鼠标                                               |
| `reducedMotion`     | `boolean \| 'auto'`              | `'auto'` | `auto` 尊重 `prefers-reduced-motion`：无呼吸/眨眼/跟随，快速临界阻尼过渡 |
| `pauseOffscreen`    | `boolean`                        | `true`   | 离屏时停止动画                                                           |
| `label`             | `string`                         | 状态名   | `aria-label`                                                             |
| `states`            | `Record<string, StateDef>`       | —        | 仅此实例生效的额外/覆盖状态                                              |
| `className`         | `string`                         | —        | 加到 `<svg>` 上的类名                                                    |
| `onChange`          | `(state, prev) => void`          | —        | 每次状态变化后回调                                                       |

#### 实例方法

| 成员                                                             | 说明                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `el`                                                             | `<svg>`（`class="npface"`，`data-state="…"`）    |
| `state`                                                          | 当前状态名                                       |
| `set(name, { immediate? })`                                      | 切换状态；`immediate` 直接跳转                   |
| `pulse(name, ms?)`                                               | 播一次再回落（时长默认取状态定义，否则 1500 ms） |
| `blink()`                                                        | 立即眨眼                                         |
| `follow(on)`                                                     | 开关鼠标跟随                                     |
| `look(x, y)` / `look(null)`                                      | 固定视线方向                                     |
| `setColors(partial)` · `setSize()` · `setTheme()` · `setLabel()` | 运行时调整                                       |
| `destroy()`                                                      | 停止并移除                                       |

同时导出：`STATES`、`STATE_NAMES`、`ALIASES`、`registerState(name, def)`、`resolveStateName()`、`BASE_EYE`、`BASE_HEAD`、`SPRINGS`、`PALETTE`、`LIGHT_COLORS`、`DARK_COLORS`，以及几何工具（`HELMET_PATH`、`eyePath` …）用于静态渲染。

### 状态表

| 状态          | 样子                                                    | 含义                            | 备注                                                               |
| ------------- | ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `idle`        | <img src="./assets/states/idle.svg" width="72"/>        | 待机                            | 呼吸、随机扫视、自动眨眼                                           |
| `blink`       | <img src="./assets/states/blink.svg" width="72"/>       | 眨眼（自动）                    | `pulse('blink')` / `blink()` 手动触发                              |
| `happy`       | <img src="./assets/states/happy.svg" width="72"/>       | 开心                            | 眯眼笑 + 弹跳；适合 pulse                                          |
| `proud`       | <img src="./assets/states/proud.svg" width="72"/>       | 完成 / 自豪                     | 别名 `complete`、`done`、`success`；抬头 + 点头；pulse             |
| `thinking`    | <img src="./assets/states/thinking.svg" width="72"/>    | 思考                            | 眼睛上望、歪头、游移                                               |
| `search-docs` | <img src="./assets/states/search-docs.svg" width="72"/> | 文档检索（RAG / 文件 / 知识库） | 逐行快速扫读、翻页一闪；别名 `rag`、`reading`、`retrieval`、`docs` |
| `search-web`  | <img src="./assets/states/search-web.svg" width="72"/>  | 联网检索                        | 圆眼像雷达一样转圈；别名 `searching`、`search`、`browsing`、`web`  |
| `working`     | <img src="./assets/states/working.svg" width="72"/>     | 执行中                          | 眯眼专注、逐行扫读；别名 `busy`                                    |
| `waiting`     | <img src="./assets/states/waiting.svg" width="72"/>     | 等你答复                        | 歪头疑问、一只眼睁大；别名 `ask`、`question`                       |
| `error`       | <img src="./assets/states/error.svg" width="72"/>       | 出错 / 晕                       | X 眼晃悠；别名 `dizzy`、`fail`；pulse                              |
| `sad`         | <img src="./assets/states/sad.svg" width="72"/>         | 难过 / 疲惫                     | 眼皮下垂、低头；别名 `tired`                                       |
| `sleep`       | <img src="./assets/states/sleep.svg" width="72"/>       | 离线 / 暂停                     | 闭眼慢呼吸、zzz                                                    |
| `wake`        | <img src="./assets/states/wake.svg" width="72"/>        | 上线                            | 睁眼、伸展，然后自动 → `idle`                                      |

上表预览是用引擎本身录制的动态 SVG（`pnpm assets`）；完整效果见[在线演示](https://scccc6ut.github.io/npface/)。

### 自定义

**配色与主题**

```ts
createNpface(el, { theme: 'dark', colors: { eye: '#5ef2c0', rim: 'rgba(255,255,255,.15)' } });
face.setColors({ body: '#12315c' });
```

品牌色：藏青 `#0f1d3a`、荧光绿 `#c7f636`、深绿 `#4c6606`、浅绿底 `#eff8cf`、米灰 `#e9ebe4`、暖白 `#f6f7f2`（导出为 `PALETTE`）。

**自定义状态**——状态就是数据。眼睛是参数化圆角方形：尺寸（`w`、`h`）、圆角（`r`）、偏移（`x`、`y`）、旋转、上下眼睑（`lidT`、`lidB`，各带倾斜与弧度）、X 叠加（`cross`）与填充。需要镜像的属性按左眼书写，右眼自动翻转。

```ts
import { registerState } from 'npface';

registerState('wink', { extends: 'happy', eyes: [{ lidT: 0.9 }, {}], pulse: 700 });

registerState('love', {
  eye: { r: 1, w: 16, h: 16, lidB: 0.35, curveB: 0.6 },
  head: { y: -1 },
  spring: 'bouncy',
  motions: [{ type: 'sine', target: 'head.rot', amp: 3, period: 900 }],
  sequence: {
    steps: [
      { at: 0, head: { sy: 0.95 } },
      { at: 150, head: { sy: 1 } },
    ],
  },
});

face.set('love');
```

动作原语：`sine`（正弦）、`sweep`（扫读并快速回扫）、`wander`（随机游走）、`glance`（扫视并回正）、`keys`（阶梯取值）；再加 `blink: { every, double }`、进入时的 `sequence` 编排、`next`（自动跳转）、`pulse`（一次性时长）与 `zzz`。完整表情库就是 [`packages/core/src/states.ts`](./packages/core/src/states.ts) 这一个文件。

### 与 AI 代理对接

后端只需要在原有事件里带上一个**状态名**，不需要任何动画逻辑。

```ts
// SSE / WebSocket 载荷：{ agentId: 'nova', status: 'search-docs' }
es.onmessage = (e) => {
  const { status, event } = JSON.parse(e.data);
  if (event === 'done') face.pulse('proud');
  else face.set(status); // thinking | search-docs | search-web | working | waiting | error | idle …
};
```

建议映射：`planning → thinking`、`检索 / RAG / 文件搜索 → search-docs`、`联网搜索 / 浏览 → search-web`、`generating / tool_call → working`、`needs_input → waiting`、`error → error`、`finished → pulse('proud')`、`offline → sleep`、`online → wake`。未知名称是安全的（→ `idle`），可以先直接透传原始状态，之后再细化映射。名称会被归一化（`searchDocs`、`search_docs`、`SEARCH-DOCS` 都可以）。

### 性能与无障碍

- 所有实例共用一个 rAF 循环；只有数值变化时才重算眼睛路径，静态状态在两次眨眼之间休眠。
- 离屏实例自动退订（IntersectionObserver），后台标签页自然暂停。
- `prefers-reduced-motion` → 静态姿态，无呼吸/眨眼/跟随，快速无回弹的过渡。
- `role="img"` + 跟随状态的 `aria-label`（或自定义 `label`）。

### 仓库结构

```
packages/core    npface        零依赖核心（TypeScript、tsup、vitest）
packages/react   npface-react  React 封装
apps/demo        展馆 / 调试台（Vite + React + Tailwind）→ GitHub Pages / Vercel
```

```bash
pnpm install
pnpm dev          # 运行 demo（直接引用包源码，支持 HMR）
pnpm check        # lint + 类型 + 构建 + 测试 + 体积预算
pnpm assets       # 用引擎重新录制 README 横幅与各状态的动态预览（SVG）
pnpm release 0.1.0 --dry-run   # 两个包同步升版本、跑检查、（演练）发布
```

### 协议

头盔、眼睛模型、状态数据与引擎均为原创，以 **MIT 协议**发布。头盔形象归 npcrew 所有。
