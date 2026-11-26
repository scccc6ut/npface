# npface

**表情头盔 · 会表情的 AI 员工头像** — an expressive, zero-dependency SVG helmet avatar for AI agents.

- 12 semantic states (`idle`, `thinking`, `searching`, `working`, `waiting`, `proud`, `error`, `sad`, `sleep`, `wake`, `happy`, `blink`), aliases, custom states
- 7 face shapes — `square` (default), `shield`, `ghost`, `cat`, `circle`, `drop`, `crown` — that morph into each other; register your own from SVG path data
- Springs, auto-blink, breathing, gaze-follows-pointer, `prefers-reduced-motion` aware, off-screen pause
- ~14 KB gzip, framework-agnostic (React bindings: [`npface-react`](https://www.npmjs.com/package/npface-react))

```ts
import { createNpface } from 'npface';

const face = createNpface('#avatar', { state: 'idle', shape: 'cat', size: 48, follow: true });
face.set('thinking');
face.setShape('crown'); // morphs
face.pulse('proud');
```

Full docs, live demo and the state gallery: **https://github.com/scccc6ut/npface**

MIT
