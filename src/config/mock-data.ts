import type { EventPhoto, MemoryEvent } from "@/types/memory";

export const mockStats = {
  daysTogether: 593, // 2024-12-20 → 2026-08-04 inclusive
  photoCount: 128,
  placeCount: 18,
  memoryCount: 12,
  draftCount: 3,
  pendingDateCount: 1,
} as const;

export const mockRelationship = {
  relationshipTitle: "OURS",
  partnerName: "乖宝",
  ownerName: "臭宝",
} as const;

export const mockChapters = [
  {
    id: "beginning",
    number: "01",
    title: "我们的开始",
    oneLine: "一切都还很轻，却已经记得很清楚。",
    memoryCount: 2,
    dateRange: "2023 — 2024",
    gradient: "linear-gradient(145deg, #2a2420 0%, #b46a6a 48%, #c6a15b 100%)",
  },
  {
    id: "ordinary_days",
    number: "02",
    title: "普通日子",
    oneLine: "没有仪式的一天，也值得被保存。",
    memoryCount: 4,
    dateRange: "2024 — 2025",
    gradient: "linear-gradient(160deg, #f6f1ea 0%, #e8ded4 40%, #7a706a 100%)",
  },
  {
    id: "journeys",
    number: "03",
    title: "一起出发",
    oneLine: "行李总是多带一点，笑声也是。",
    memoryCount: 3,
    dateRange: "2024 — 2025",
    gradient: "linear-gradient(135deg, #1b1d22 0%, #3d4a5c 50%, #c6a15b 100%)",
  },
  {
    id: "food_and_places",
    number: "04",
    title: "吃过的东西和去过的地方",
    oneLine: "味道会消失，记录不会。",
    memoryCount: 2,
    dateRange: "2025",
    gradient: "linear-gradient(150deg, #fffdf9 0%, #d4a574 55%, #201c1a 100%)",
  },
  {
    id: "celebrations",
    number: "05",
    title: "值得庆祝的时刻",
    oneLine: "蛋糕、蜡烛，还有没说完的话。",
    memoryCount: 1,
    dateRange: "2025",
    gradient: "linear-gradient(145deg, #111216 0%, #b46a6a 45%, #fffdf9 100%)",
  },
  {
    id: "growing_together",
    number: "06",
    title: "一起慢慢长大",
    oneLine: "我们学会把小事说清楚。",
    memoryCount: 0,
    dateRange: "—",
    gradient: "linear-gradient(160deg, #201c1a 0%, #7a706a 100%)",
  },
  {
    id: "future",
    number: "07",
    title: "写给未来",
    oneLine: "这一页还空着，正好留给以后。",
    memoryCount: 0,
    dateRange: "—",
    gradient: "linear-gradient(180deg, #1b1d22 0%, #111216 100%)",
  },
] as const;

const photo = (
  id: string,
  label: string,
  role: EventPhoto["role"],
  orientation: EventPhoto["orientation"],
  gradient: string,
): EventPhoto => ({
  id,
  label,
  role,
  orientation,
  gradient,
  alt: `抽象占位图：${label}`,
});

export const mockMemories: Array<
  MemoryEvent & { photos: EventPhoto[] }
> = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "evening-walk-by-the-river",
    title: "江边的晚风",
    subtitle: "没有计划的夜晚",
    oneLine: "那天的晚风很轻，你也很安静。",
    diaryBody:
      "我们沿着江边慢慢走。天色一点点暗下去，路灯一盏一盏亮起来。\n\n没有特别的计划，只是把这一天留到了晚上。手机拍下几张几乎看不清的照片，却刚好记下了那种刚好的温度。\n\n后来回想，记得最清楚的不是风景，而是并肩时谁也没有催谁回家。",
    eventDate: "2025-05-20",
    placeName: "江边步道",
    templateId: "editorial-hero",
    status: "published",
    mood: "quiet",
    tags: ["日常", "夜晚"],
    chapter: "ordinary_days",
    photos: [
      photo("p1", "暮色江面", "cover", "landscape", "linear-gradient(160deg,#1a1c22,#4a5568 40%,#c6a15b)"),
      photo("p2", "并肩剪影", "hero", "portrait", "linear-gradient(180deg,#201c1a,#b46a6a 70%,#e8ded4)"),
      photo("p3", "路灯细节", "detail", "square", "linear-gradient(135deg,#111216,#7a706a,#f6f1ea)"),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "weekend-breakfast",
    title: "周末的早饭",
    subtitle: null,
    oneLine: "太阳很好，咖啡有点烫。",
    diaryBody:
      "周末的早晨总是慢半拍。你点了平时不会点的东西，我把照片拍糊了两张。\n\n后来我们都觉得，糊掉的那两张反而更像真实的周末——光线太亮，桌子太挤，笑得太突然。",
    eventDate: "2025-06-08",
    placeName: "街角咖啡馆",
    templateId: "split-story",
    status: "published",
    mood: "warm",
    tags: ["食物", "日常"],
    chapter: "food_and_places",
    photos: [
      photo("p4", "窗边光", "hero", "portrait", "linear-gradient(200deg,#fffdf9,#e8c9a0 50%,#7a706a)"),
      photo("p5", "咖啡杯", "food", "square", "linear-gradient(145deg,#f6f1ea,#d4a574,#201c1a)"),
      photo("p6", "桌面细节", "detail", "landscape", "linear-gradient(120deg,#e8ded4,#b46a6a40,#201c1a)"),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    slug: "train-to-somewhere",
    title: "去往某处的列车",
    subtitle: "第一次一起过夜车",
    oneLine: "窗外的城市一块一块暗下去。",
    diaryBody:
      "座位靠窗。你把外套盖在腿上，耳机分给我一只。\n\n列车经过隧道时，车厢里只剩呼吸和轨道声。出来时天已经亮了一点，远处有山的轮廓。我们没有急着拍照，只是把那一刻记在心里，后来才补进这个档案。",
    eventDate: "2025-03-14",
    placeName: null,
    templateId: "film-strip",
    status: "published",
    mood: "nostalgic",
    tags: ["旅行"],
    chapter: "journeys",
    photos: [
      photo("p7", "车窗夜色", "cover", "landscape", "linear-gradient(90deg,#111216,#2c3340,#c6a15b55)"),
      photo("p8", "座位一角", "candid", "portrait", "linear-gradient(180deg,#1b1d22,#7a706a,#f6f1ea)"),
      photo("p9", "晨光山影", "place", "landscape", "linear-gradient(160deg,#3d4a5c,#e8ded4,#c6a15b)"),
      photo("p10", "车票纹理", "detail", "square", "linear-gradient(135deg,#fffdf9,#e8ded4,#201c1a)"),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    slug: "rainy-bookstore",
    title: "下雨的书店",
    oneLine: "雨声把时间放慢了。",
    diaryBody:
      "我们躲进书店，谁也没有说话。书架之间窄得刚好并肩。你抽出一本书给我看封面，我只记得纸张的气味和玻璃上的水痕。\n\n出门时雨小了，路还是湿的。",
    eventDate: "2025-04-02",
    placeName: "旧城区书店",
    templateId: "polaroid-stack",
    status: "published",
    mood: "quiet",
    tags: ["日常", "地点"],
    chapter: "ordinary_days",
    photos: [
      photo("p11", "橱窗雨痕", "cover", "portrait", "linear-gradient(180deg,#4a5568,#e8ded4 60%,#fffdf9)"),
      photo("p12", "书脊色块", "detail", "square", "linear-gradient(145deg,#b46a6a,#c6a15b,#201c1a)"),
      photo("p13", "门口积水", "place", "landscape", "linear-gradient(120deg,#1b1d22,#7a706a,#f6f1ea)"),
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    slug: "birthday-evening",
    title: "生日那天晚上",
    oneLine: "蜡烛灭了以后，房间更安静。",
    diaryBody:
      "蛋糕比想象中甜一点。你许愿时闭眼很久，我没有追问愿望是什么。\n\n只记得灯光关掉又打开，桌上有一点蜡油，还有一张我们都笑得很傻的照片——这一页就留给它。",
    eventDate: "2025-08-04",
    placeName: "家里",
    templateId: "full-bleed-quote",
    status: "published",
    mood: "romantic",
    tags: ["庆祝"],
    chapter: "celebrations",
    photos: [
      photo("p14", "烛光暖色", "hero", "landscape", "linear-gradient(160deg,#111216,#b46a6a 45%,#c6a15b)"),
      photo("p15", "桌面留白", "detail", "square", "linear-gradient(135deg,#fffdf9,#e8ded4,#b46a6a55)"),
    ],
  },
];

export const mockDrafts = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    title: "未命名草稿 · 海边",
    eventDate: "待确认",
    photoCount: 6,
    updatedAt: "刚刚自动保存",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    title: "商场里的雨天",
    eventDate: "2025-07-12",
    photoCount: 4,
    updatedAt: "昨天",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    title: "深夜便利店",
    eventDate: "2025-07-28",
    photoCount: 3,
    updatedAt: "3 天前",
  },
] as const;

export const mockLetter = {
  title: "写给你的一封信",
  letterDate: "2026-09-14",
  body: `这个档案没有最后一页。

因为往后的每一次出门、
每一顿饭、每一次旅行，
都会成为我们一起写下的新章节。

那些平凡却闪闪发亮的点点滴滴，
我都会好好收藏在这里。

我们会继续一起生活，
一起创造新的回忆，
把属于我们的故事，
慢慢写成一本没有结局的书。

生日快乐。
谢谢你来到我的生命里，
也谢谢你愿意陪我一起，把未来写下去。`,
} as const;

export function getMemoryBySlug(slug: string) {
  return mockMemories.find((memory) => memory.slug === slug);
}

export function getMemoryById(id: string) {
  return mockMemories.find((memory) => memory.id === id) ?? mockMemories[0];
}

export function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return { year, month, day, short: `${month}.${day}` };
}
