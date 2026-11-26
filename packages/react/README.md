# npface-react

React bindings for [npface](https://github.com/scccc6ut/npface) — **表情头盔 · 会表情的 AI 员工头像**, an expressive zero-dependency helmet avatar for AI agents.

```tsx
import { useRef } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';

export function Employee({ status }: { status: string }) {
  const face = useRef<NpfaceHandle>(null);
  return (
    <Npface ref={face} state={status} shape="circle" size={48} follow onStateChange={console.log} />
  );
  // face.current?.pulse('proud')
}
```

Props: `state` (alias `emotion`), `size`, `shape` (changing it morphs the helmet), `colors`, `theme`, `follow`/`gaze`, `look`, `reducedMotion`, `pauseOffscreen`, `label`, `states`, `svgClassName`, `immediate`, `onStateChange` + any `<span>` attributes. `"use client"` — works in Next.js App Router. Also exports `useNpface()` and re-exports `createNpface`.

Full docs & live demo: **https://github.com/scccc6ut/npface**

MIT
