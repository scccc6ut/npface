export interface StateMeta {
  name: string;
  en: string;
  zh: string;
  descEn: string;
  descZh: string;
  /** good as a one-shot pulse */
  pulse?: boolean;
  /** automatic overlay */
  auto?: boolean;
  aliases?: string[];
}

export const STATE_META: StateMeta[] = [
  { name: 'idle', en: 'Idle', zh: '待机', descEn: 'Calm breathing, the odd glance, blinks.', descZh: '平静呼吸，偶尔扫视、眨眼。' },
  { name: 'blink', en: 'Blink', zh: '眨眼', auto: true, descEn: 'Automatic in most states; also pulse("blink").', descZh: '大部分状态自动眨眼，也可 pulse("blink")。' },
  { name: 'happy', en: 'Happy', zh: '开心', pulse: true, descEn: 'Smiling arch-eyes and a little bounce.', descZh: '眯眼笑 + 轻微弹跳。' },
  { name: 'proud', en: 'Proud', zh: '自豪 · 完成', pulse: true, aliases: ['complete', 'done'], descEn: 'Task done — chin up, confident nod.', descZh: '任务完成——抬头挺胸，自信点头。' },
  { name: 'thinking', en: 'Thinking', zh: '思考', descEn: 'Eyes drift up, head tilts, glances around.', descZh: '眼睛斜上方游移，歪头沉思。' },
  { name: 'searching', en: 'Searching', zh: '检索', descEn: 'Round eyes circling — looking things up.', descZh: '圆眼转圈——正在检索。' },
  { name: 'working', en: 'Working', zh: '工作中', descEn: 'Focused narrow eyes, scanning line by line.', descZh: '眯眼专注，逐行扫读。' },
  { name: 'waiting', en: 'Waiting', zh: '等待回复', descEn: 'Head cocked, one eye raised: your move.', descZh: '歪头疑问，等你答复。' },
  { name: 'error', en: 'Error', zh: '出错 · 晕', pulse: true, aliases: ['dizzy', 'fail'], descEn: 'X eyes, wobbling — something went wrong.', descZh: 'X 眼晃悠——出错了。' },
  { name: 'sad', en: 'Sad', zh: '难过 · 疲惫', aliases: ['tired'], descEn: 'Droopy lids, head hanging low.', descZh: '眼皮下垂，耷拉着头。' },
  { name: 'sleep', en: 'Sleep', zh: '睡眠', descEn: 'Closed eyes, slow breathing, z z z.', descZh: '闭眼慢呼吸，zzz。' },
  { name: 'wake', en: 'Wake', zh: '唤醒', descEn: 'Eyes pop open, a stretch, then idle.', descZh: '睁眼、伸展，然后回到待机。' },
];

/** States that loop visually on their own (good for the hero carousel). */
export const SHOWCASE = ['idle', 'happy', 'thinking', 'searching', 'working', 'waiting', 'proud', 'error', 'sad', 'sleep'];

export const COLOR_PRESETS: { name: string; colors: { body: string; visor: string; eye: string } }[] = [
  { name: 'npcrew', colors: { body: '#0f1d3a', visor: '#ffffff', eye: '#c7f636' } },
  { name: 'mint', colors: { body: '#0b3b3a', visor: '#e8fff6', eye: '#5ef2c0' } },
  { name: 'sunset', colors: { body: '#3b1124', visor: '#fff1e6', eye: '#ff8a3d' } },
  { name: 'mono', colors: { body: '#1f2328', visor: '#ffffff', eye: '#1f2328' } },
  { name: 'lime-visor', colors: { body: '#0f1d3a', visor: '#c7f636', eye: '#0f1d3a' } },
  { name: 'sky', colors: { body: '#12315c', visor: '#eaf4ff', eye: '#63b3ff' } },
];
