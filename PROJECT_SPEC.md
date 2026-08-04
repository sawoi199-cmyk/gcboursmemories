# OURS — AI 情侣时光档案馆
## Cursor 项目开发总规范

> 文件用途：将本文件放在项目根目录，命名为 `PROJECT_SPEC.md`。  
> Cursor 每次开始工作前必须先完整阅读本文件。  
> 参考设计图建议放在：`docs/design-reference.png`

---

# 1. 项目目标

开发一个名为 **OURS** 的私人情侣回忆档案系统。

它不是普通相册，也不是 Google Photos 的替代品，而是一份会持续成长的生日礼物：

- 生日当天，女朋友可以进入一个具有电影感的私人回忆网站。
- 网站展示两个人的照片、故事、地点、纪念日、日记与生日信。
- 生日以后，用户只需要上传照片，系统便自动整理照片、建立事件、生成日记草稿并选择合适版式。
- 所有 AI 内容必须先由用户确认，不能自动公开。
- 所有照片和私人信息默认保持私密。

项目需要同时包含：

1. **前台回忆体验**
2. **后台上传与编辑系统**
3. **AI 日记生成**
4. **自动照片分组**
5. **模板化自动排版**
6. **私密访问控制**

---

# 2. 核心体验

## 2.1 女朋友看到的体验

打开网站后，不直接出现菜单或文件夹，而是进入一段沉浸式故事。

推荐开场：

```text
PERSONAL MEMORY ARCHIVE

Identity verification required.
```

验证成功后：

```text
IDENTITY CONFIRMED

Welcome back, [partner_name]
```

然后显示：

```text
有些照片记录了一天。
有些照片，记录了我们。
```

接着出现动态统计：

```text
我们认识后的第 {{daysTogether}} 天
保存了 {{photoCount}} 个瞬间
一起去过 {{placeCount}} 个地方
写下了 {{memoryCount}} 篇回忆
```

按钮：

```text
打开我们的故事
```

---

## 2.2 用户后台体验

用户后台主要流程：

```text
上传照片
→ 读取 EXIF
→ 按日期和地点自动分组
→ 用户确认事件
→ 用户补充一句真实记忆
→ AI 生成标题、短句和日记
→ 系统推荐版式
→ 用户调整照片和文字
→ 保存草稿
→ 发布
```

AI 只负责：

- 理解内容
- 生成日记草稿
- 推荐模板
- 推荐照片角色

AI 不负责：

- 直接生成 HTML
- 自由设计 CSS
- 未经确认自动发布
- 虚构日期、地点或事件

---

# 3. 产品原则

必须遵守：

1. 手机端优先。
2. 前台必须像回忆体验，不像后台系统。
3. 后台必须简单，不让用户处理复杂技术细节。
4. AI 只生成草稿。
5. 用户文字是最高优先级事实。
6. 不允许 AI 虚构重要细节。
7. 不公开照片。
8. 不把真实密码放入前端。
9. 不硬编码姓名、生日和纪念日。
10. 不自动播放音乐。
11. 不设计成公开社交平台。
12. 不使用大量粉红、爱心和幼稚元素。
13. 风格应成熟、温暖、有电影感和杂志感。
14. 每个阶段完成后必须测试。
15. 一次只实现一个阶段。

---

# 4. MVP 功能范围

## 4.1 前台

第一版必须完成：

- 私密解锁页
- 生日开场页
- 故事章节页
- 回忆时间线
- 单篇回忆详情页
- 生日信页面
- 全屏照片查看
- 背景音乐开关
- 前一篇 / 后一篇回忆
- 响应式手机和桌面设计

## 4.2 后台

第一版必须完成：

- 管理员登录
- 多照片上传
- 上传进度
- EXIF 日期读取
- EXIF GPS 读取
- 自动照片分组
- 手动合并事件
- 手动拆分事件
- 调整照片顺序
- 设置封面
- 输入真实记忆
- AI 生成日记
- 编辑日记
- 切换模板
- 保存草稿
- 发布
- 取消发布
- 自动保存
- 日记版本记录

## 4.3 第一版暂不开发

- 人脸识别
- 自动识别情侣身份
- 公开注册
- 多用户 SaaS
- 评论区
- 社交分享系统
- AI 自动生成情侣照片
- 视频剪辑
- 付费系统
- 复杂地图路线规划
- 大型搜索引擎
- 自动推送通知

---

# 5. 技术栈

必须使用：

```text
Framework: Next.js App Router
Language: TypeScript
Styling: Tailwind CSS
UI: shadcn/ui
Animation: Framer Motion
Database: Supabase PostgreSQL
Auth: Supabase Auth
Original Storage: Google Drive (via Apps Script gateway)
Thumbnail Storage: Supabase Storage (private)
Validation: Zod
EXIF: exifr
Image Processing: sharp
Testing: Vitest + Playwright
Deployment: Vercel
```

禁止：

- 使用 JavaScript 代替 TypeScript
- 在页面组件中混入大量业务逻辑
- 把 Service Role Key 放到客户端
- 使用公开 Storage Bucket
- 将 Google Drive 文件设为「任何人可查看」
- 向前端暴露长期 Drive 直链
- 把 Base64 图片保存进数据库
- 使用 `any` 逃避类型问题
- 在没有说明时更换技术栈
- 使用 Cloudflare R2（本项目不采用）

---

# 6. 推荐目录结构

```text
src/
├── app/
│   ├── (experience)/
│   │   ├── page.tsx
│   │   ├── unlock/
│   │   │   └── page.tsx
│   │   ├── story/
│   │   │   └── page.tsx
│   │   ├── timeline/
│   │   │   └── page.tsx
│   │   ├── memory/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── letter/
│   │   │   └── page.tsx
│   │   └── today/
│   │       └── page.tsx
│   │
│   ├── (studio)/
│   │   ├── studio/
│   │   │   ├── page.tsx
│   │   │   ├── upload/
│   │   │   │   └── page.tsx
│   │   │   ├── drafts/
│   │   │   │   └── page.tsx
│   │   │   ├── memories/
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── templates/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── unlock/
│   │   ├── uploads/
│   │   ├── memories/
│   │   ├── ai/
│   │   └── signed-image/
│   │
│   └── auth/
│
├── components/
│   ├── experience/
│   ├── studio/
│   ├── memory-layouts/
│   ├── photo-viewer/
│   ├── motion/
│   └── ui/
│
├── features/
│   ├── uploads/
│   ├── memories/
│   ├── diary-generation/
│   ├── event-grouping/
│   ├── templates/
│   └── relationship-profile/
│
├── lib/
│   ├── supabase/
│   ├── google-drive/
│   ├── ai/
│   ├── exif/
│   ├── security/
│   ├── image/
│   └── utils/
│
├── types/
├── config/
└── styles/
```

---

# 7. 数据库设计

所有数据库结构必须通过 Supabase Migration 建立。

## 7.1 profiles

```sql
id uuid primary key
display_name text not null
avatar_path text
role text check (role in ('owner', 'partner'))
created_at timestamptz default now()
updated_at timestamptz default now()
```

## 7.2 relationship_settings

```sql
id uuid primary key
owner_id uuid not null
relationship_title text not null
partner_name text not null
owner_name text not null
owner_nickname text
partner_nickname text
relationship_start_date date
birthday_date date
unlock_title text
unlock_hint text
default_diary_tone text default 'warm'
default_language text default 'zh-CN'
music_enabled boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

## 7.3 memory_events

```sql
id uuid primary key
owner_id uuid not null
slug text unique not null
title text not null
subtitle text
one_line text
diary_body text
event_date date not null
event_start_time timestamptz
event_end_time timestamptz
place_name text
latitude numeric
longitude numeric
mood text
chapter text
template_id text not null
cover_photo_id uuid
status text check (status in ('draft', 'published', 'archived'))
is_featured boolean default false
ai_generated boolean default false
ai_confidence numeric
published_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

## 7.4 photos

```sql
id uuid primary key
owner_id uuid not null
drive_file_id text not null
drive_folder_id text
thumbnail_path text
original_filename text not null
mime_type text not null
width integer
height integer
size_bytes bigint
taken_at timestamptz
latitude numeric
longitude numeric
camera_model text
orientation integer
caption text
alt_text text
dominant_subject text
created_at timestamptz default now()
```

## 7.5 event_photos

```sql
event_id uuid not null
photo_id uuid not null
sort_order integer not null
role text check (
  role in (
    'cover',
    'hero',
    'detail',
    'food',
    'place',
    'portrait',
    'candid'
  )
)
crop_x numeric
crop_y numeric
crop_zoom numeric
primary key (event_id, photo_id)
```

## 7.6 memory_tags

```sql
id uuid primary key
name text unique not null
category text check (
  category in (
    'mood',
    'place',
    'activity',
    'food',
    'relationship'
  )
)
```

## 7.7 event_tags

```sql
event_id uuid not null
tag_id uuid not null
primary key (event_id, tag_id)
```

## 7.8 diary_versions

```sql
id uuid primary key
event_id uuid not null
title text not null
one_line text
diary_body text not null
tone text not null
source text check (source in ('ai', 'user'))
created_at timestamptz default now()
```

## 7.9 letters

```sql
id uuid primary key
title text not null
body text not null
letter_date date
status text check (status in ('draft', 'published'))
created_at timestamptz default now()
updated_at timestamptz default now()
```

---

# 8. Storage 设计

采用混合存储（见 DECISIONS.md Decision 001）：

```text
原图 / HEIC / 音频 → Google Drive（经 Google Apps Script 网关，使用 Google One 容量）
缩略图 / AI 分析小图 → Supabase Storage 私有桶
```

## 8.1 Google Drive

文件夹约定：

```text
OURS/
  originals/
  audio/
```

路径逻辑（Drive 侧文件名）：

```text
{ownerId}_{year}{month}_{uuid}.{extension}
```

数据库只存 `drive_file_id`（及可选 `drive_folder_id`），不存公开分享链接。

## 8.2 Supabase Storage

仅建立私有 Bucket：

```text
memory-thumbnails
memory-ai-previews   （可选，供 AI 分析用低分辨率图）
```

缩略图路径格式：

```text
{ownerId}/{year}/{month}/{uuid}.jpg
```

## 8.3 要求

- Supabase Bucket 必须为 private。
- Drive 文件禁止设为「任何人可查看」。
- 原图不得使用永久公开 URL，也不得向前端暴露长期 `drive.google.com` 直链。
- 时间线：加载 Supabase 缩略图 signed URL（默认有效期不超过 1 小时）。
- 全屏原图：经 `/api/signed-image`（或等价）校验 partner/admin session 后，服务端通过 GAS `getFile` 拉取并流式返回。
- 上传原图：服务端调用 GAS `upload`（base64）写入 Drive，再写入 `photos.drive_file_id`。超大文件后续可再评估分片。
- 缩略图：服务端 `sharp` 生成（含 HEIC→JPEG）后写入 Supabase。
- 单张图片默认限制 20 MB。
- 接受 JPEG、PNG、WEBP、HEIC。
- HEIC 必须生成可浏览 JPEG 缩略图。
- 原图永不写入 Supabase（节省免费额度）。
- 不删除原图。
- 不把图片 Base64 存入数据库。
- 不使用 Cloudflare R2。

---

# 9. 私密访问设计

## 9.1 管理员

管理员使用 Supabase Auth。

管理员可以：

- 上传照片
- 编辑草稿
- 删除草稿
- 发布回忆
- 修改关系资料
- 修改生日信
- 管理模板

## 9.2 女朋友访问

女朋友不使用公开数据库权限。

流程：

```text
输入专属密码
→ 服务端验证密码 Hash
→ 创建签名 Session Cookie
→ Cookie 设置 HttpOnly
→ Cookie 设置 Secure
→ Cookie 设置 SameSite=Lax
→ 服务端读取已发布内容
```

环境变量：

```env
BIRTHDAY_ACCESS_HASH=
SESSION_SIGNING_SECRET=
```

禁止：

- 明文密码进入 Git
- 明文密码进入前端
- 密码保存在 localStorage
- Service Role Key 以 NEXT_PUBLIC 开头
- 未登录访客直接读取 photos 表
- 未登录访客直接读取 Storage 或 Drive 原图

---

# 10. 上传流程

上传页面分为四步：

```text
1. 上传照片
2. 确认事件分组
3. 补充真实记忆
4. 生成日记与设计
```

完整流程：

```text
选择照片
→ 本地预览
→ 读取 EXIF
→ 服务端经 GAS 上传原图至 Google Drive
→ 服务端验证并写入 drive_file_id
→ 生成缩略图并写入 Supabase 私有桶
→ 建立 photos 记录
→ 自动建立事件候选
→ 用户确认
```

必须支持：

- 多选照片
- 拖放
- 单张取消
- 上传进度
- 上传失败重试
- 上传并发限制 3 至 4 张
- 刷新后不丢失已上传照片
- 手机相册上传
- HEIC 上传

---

# 11. EXIF 处理

尝试读取：

```text
DateTimeOriginal
GPSLatitude
GPSLongitude
Orientation
CameraModel
```

如果没有拍摄日期：

1. 可使用文件最后修改日期作为低置信度候选。
2. UI 必须提示用户确认。
3. 不可以把上传日期静默当成拍摄日期。

---

# 12. 自动事件分组

第一版使用确定性规则，不使用复杂 AI 聚类。

算法：

```text
1. 按 taken_at 排序。
2. 日期相同且时间差不超过 12 小时，优先归为同一事件。
3. 若两张照片都有 GPS，距离小于 5 公里，增加同组置信度。
4. 跨越午夜但时间差小于 4 小时，可以归为同一事件。
5. 连续照片时间相差超过 4 小时，建立新候选事件。
6. 用户可以手动合并、拆分和移动照片。
```

需要实现：

- 合并事件
- 拆分事件
- 把照片拖到另一个事件
- 修改事件日期
- 修改地点
- 选择封面
- 调整顺序

---

# 13. AI Provider 设计

不能把模型写死。

统一接口：

```ts
interface AIProvider {
  analyzeMemory(
    input: MemoryAnalysisInput
  ): Promise<MemoryAnalysisResult>;
}
```

至少实现：

```text
MockAIProvider
OpenAICompatibleProvider
```

环境变量：

```env
AI_PROVIDER=mock
AI_MODEL=
AI_API_KEY=
AI_BASE_URL=
```

没有 AI Key 时，系统必须仍然能够运行。

---

# 14. AI 输入

用户填写：

```text
这一天发生了什么？
有什么细节一定要记住？
有什么内容不要写进日记？
希望用什么语气？
```

AI 输入包含：

- 缩略图
- 日期
- 地点
- 用户备注
- 已知关系资料
- 不可提及内容
- 日记语气
- 页面语言

原图不能直接全部送到 AI。

推荐流程：

```text
原图
→ 生成低分辨率分析图
→ 移除多余 EXIF
→ 发送 AI
```

---

# 15. AI 事实规则

AI 必须遵守：

1. 用户备注是第一事实来源。
2. 不猜测人物关系。
3. 不猜测餐厅名称。
4. 不猜测具体地点。
5. 不根据外貌推断年龄、职业、健康、宗教或其他敏感属性。
6. 不生成“这是第一次……”除非资料明确证明。
7. 不将照片中其他人物当作故事主角。
8. 不确定内容必须放进 `questionsToConfirm`。
9. 将观察和推断分开。
10. 不使用空泛鸡汤。
11. 不使用夸张承诺。
12. AI 输出永远是草稿。
13. AI 不能自动发布。

---

# 16. AI 返回 Schema

使用 Zod 严格验证。

```ts
import { z } from "zod";

export const MemoryAnalysisSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().max(120).nullable(),
  oneLine: z.string().min(1).max(160),
  diaryBody: z.string().min(50).max(3000),

  mood: z.enum([
    "warm",
    "joyful",
    "quiet",
    "romantic",
    "playful",
    "nostalgic",
    "adventurous"
  ]),

  tags: z.array(z.string()).max(8),

  placeSuggestion: z.string().nullable(),

  chapterSuggestion: z.enum([
    "beginning",
    "ordinary_days",
    "journeys",
    "celebrations",
    "food_and_places",
    "growing_together",
    "future"
  ]),

  templateSuggestion: z.string(),

  photoRoles: z.array(
    z.object({
      photoId: z.string().uuid(),
      role: z.enum([
        "cover",
        "hero",
        "portrait",
        "candid",
        "food",
        "place",
        "detail"
      ]),
      cropFocus: z.enum([
        "center",
        "face",
        "top",
        "bottom",
        "left",
        "right"
      ])
    })
  ),

  confidence: z.number().min(0).max(1),

  questionsToConfirm: z.array(z.string()).max(5),

  inferredFacts: z.array(z.string()).max(10)
});
```

当验证失败：

1. 自动要求模型修复一次。
2. 第二次失败后显示友善错误。
3. 不删除照片。
4. 不清空用户输入。
5. 不让页面崩溃。
6. 允许稍后重试。

---

# 17. AI 系统提示词

必须放在服务端。

```text
You are the diary-writing assistant for a private couple memory archive.

Your job is to transform verified user notes, photo metadata and visual observations into a warm, natural diary draft.

Rules:
1. The user's written notes are the primary source of truth.
2. Never invent dates, places, first-time events, promises or relationship milestones.
3. Do not infer sensitive personal attributes.
4. Do not identify unknown people.
5. Do not assume every person in a photo is part of the couple.
6. Use specific observable details instead of generic romantic phrases.
7. Avoid clichés, exaggerated promises and overly dramatic language.
8. When uncertain, add a question to questionsToConfirm.
9. Separate observed facts from inferred facts.
10. Return only valid JSON matching the supplied schema.
11. Do not include Markdown.
12. Do not mention that you are an AI.
13. Keep the writing personal, gentle and believable.
14. The output is a draft and will be reviewed by the user.
```

用户提示词：

```text
Language:
{{language}}

Tone:
{{tone}}

Verified user note:
{{userNote}}

Do not mention:
{{excludedDetails}}

Known relationship context:
{{relationshipContext}}

Event metadata:
{{eventMetadata}}

Photo observations:
{{photoObservations}}

Create a diary draft using only the supplied information.
Return JSON matching the required schema.
```

---

# 18. 日记风格

提供：

```text
温柔日记
电影旁白
轻松幽默
简短记录
旅行杂志
写给未来
```

## 温柔日记

- 自然
- 私人
- 不过度煽情
- 写具体细节
- 避免网络鸡汤

## 电影旁白

- 句子较短
- 有画面感
- 可加入日期和地点
- 不模仿现有电影台词

## 轻松幽默

- 可以写小意外
- 可以写两人互动
- 不嘲讽外貌
- 不写尴尬隐私

## 简短记录

- 50 至 120 字
- 只记录一个核心瞬间

## 旅行杂志

- 记录地点
- 记录天气
- 记录路线
- 记录食物
- 不虚构地点资料

## 写给未来

- 使用未来回看的视角
- 不做夸张承诺

---

# 19. 模板系统

AI 不能自由生成 HTML 或 CSS。

AI 只能推荐预设模板。

第一版模板：

```text
editorial-hero
split-story
polaroid-stack
film-strip
three-photo-journal
mosaic-grid
full-bleed-quote
travel-postcard
quiet-single-photo
before-after
```

统一组件接口：

```ts
interface MemoryLayoutProps {
  memory: MemoryEvent;
  photos: EventPhoto[];
  mode: "preview" | "published";
}
```

模板配置：

```ts
interface MemoryTemplateDefinition {
  id: string;
  name: string;
  minPhotos: number;
  maxPhotos: number;
  preferredOrientations: Array<
    "portrait" | "landscape" | "square"
  >;
  supportedMoods: string[];
  component: React.ComponentType<MemoryLayoutProps>;
}
```

模板选择评分：

```text
照片数量
照片方向
是否有强封面
日记长度
事件心情
是否有地点
AI 推荐
```

AI 只能加分，不能直接决定。

---

# 20. 视觉方向

参考图：

```text
docs/design-reference.png
```

整体风格：

```text
电影档案感
高级杂志
少量手账细节
深色开场
温暖正文
浪漫但不幼稚
精致但不复杂
```

## 20.1 颜色

```css
:root {
  --background: #F6F1EA;
  --paper: #FFFDF9;
  --ink: #201C1A;
  --muted: #7A706A;
  --line: #E8DED4;
  --accent: #B46A6A;
  --gold: #C6A15B;
  --night: #111216;
  --night-soft: #1B1D22;
}
```

## 20.2 字体

标题：

```text
Cormorant Garamond
Playfair Display
```

正文：

```text
Inter
Manrope
Noto Sans SC
```

要求：

- 中文优先可读性。
- 英文字体不能导致中文字形异常。
- 标题可使用 Serif。
- 正文使用清晰 Sans Serif。

## 20.3 卡片

- 卡片圆角 12px 至 18px。
- 照片圆角 4px 至 12px。
- 不使用夸张玻璃拟态。
- 不使用强霓虹。
- 阴影模拟纸张层次。
- 大量留白。
- 文字不要贴边。

## 20.4 动画

使用 Framer Motion。

建议：

```text
页面淡入：500ms
照片揭示：600ms
章节切换：700ms
卡片悬停：200ms
```

避免：

- 弹跳动画
- 过度缩放
- 每个元素同时移动
- 自动滚动
- 影响阅读的视差

必须支持：

```css
@media (prefers-reduced-motion: reduce)
```

---

# 21. 核心页面

## 21.1 `/unlock`

设计：

- 深色背景
- 中央标题
- 细扫描线
- 日期编号
- 简单密码框
- 低调金色点缀

文案：

```text
PERSONAL MEMORY ARCHIVE

This archive belongs to us.

Enter the date only we remember.
```

成功：

```text
IDENTITY CONFIRMED

Welcome back, [partner_name]
```

禁止：

- 假装真实生物识别
- 伪装政府认证
- 伪装银行认证
- 强制复杂动画

---

## 21.2 `/`

开场句：

```text
为你保存的每一个瞬间。
```

统计：

```text
我们认识后的第 X 天
共同记录的 X 个回忆
去过的 X 个地方
收藏的 X 张照片
```

按钮：

```text
打开我们的故事
```

数据必须来自数据库。

---

## 21.3 `/story`

章节：

```text
01 我们的开始
02 普通日子
03 一起出发
04 吃过的东西和去过的地方
05 值得庆祝的时刻
06 一起慢慢长大
07 写给未来
```

每个章节：

- 代表照片
- 一句话
- 回忆数量
- 日期范围

---

## 21.4 `/timeline`

桌面：

- 左侧年份
- 中央时间轴
- 右侧回忆卡

手机：

- 单列卡片
- 粘性年份
- 照片优先
- 日期清楚

筛选：

```text
全部
旅行
日常
庆祝
食物
地点
```

---

## 21.5 `/memory/[slug]`

顺序：

```text
日期
地点
标题
一句话
照片布局
日记正文
标签
前一篇
后一篇
```

不同回忆使用不同模板。

---

## 21.6 `/letter`

- 最大阅读宽度 720px。
- 使用信纸效果。
- 保留段落和留白。
- 显示签名和日期。
- 可逐段出现。
- 提供重新阅读按钮。
- 不循环播放打字音效。

结尾参考：

```text
这个档案没有最后一页。

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
也谢谢你愿意陪我一起，把未来写下去。

——你的档案管理员
```

按钮：

```text
继续记录我们的故事
```

---

## 21.7 `/studio`

显示：

```text
总照片数
已发布回忆数
草稿数
待确认日期
最近上传
快速上传
```

---

## 21.8 `/studio/upload`

四步：

```text
上传照片
确认事件
补充记忆
生成设计
```

必须有进度状态。

---

## 21.9 `/studio/memories/[id]/edit`

桌面：

```text
左：照片列表和排序
中：实时版式预览
右：内容和设置
```

手机：

```text
内容
照片
设计
预览
```

必须提供：

- 自动保存
- 最后保存时间
- 保存草稿
- 发布
- 取消发布
- 重新生成
- 恢复上一版
- 选择模板
- 设置封面
- 拖动排序

---

# 22. 背景音乐

禁止自动播放。

流程：

```text
用户点击“打开我们的故事”
→ 显示开启音乐选项
→ 用户点击后播放
```

功能：

- 播放
- 暂停
- 音量
- 会话内记住选择
- 页面切换不中断
- 默认关闭

---

# 23. 性能要求

- 使用 Next Image。
- 时间线懒加载。
- 首屏加载缩略图。
- 全屏才加载大图。
- 设置合理 `sizes`。
- 不一次加载全部照片。
- 上传并发 3 至 4 张。
- AI 请求显示状态。
- AI 请求可重试。
- 页面刷新不丢失草稿。
- 避免布局跳动。
- 不把大图放进 Server Action 参数。
- 不把 Base64 存数据库。

---

# 24. 可访问性

必须：

- 按钮有文字标签。
- 图片有 alt。
- 支持键盘。
- Modal 可用 Escape 关闭。
- 焦点状态清楚。
- 不只靠颜色表示状态。
- 表单错误与字段关联。
- 动画支持 reduced motion。
- 音乐默认关闭。
- 对比度合格。

---

# 25. 测试

## Unit Tests

- EXIF 日期标准化
- GPS 距离计算
- 事件分组
- AI JSON 验证
- 模板评分
- slug 生成
- 权限判断

## Integration Tests

- 上传后建立 photos
- 建立事件草稿
- Mock AI 生成日记
- 保存编辑
- 发布
- 草稿不对访客可见
- signed URL 正常生成

## E2E

使用 Playwright：

```text
管理员登录
上传测试照片
建立事件
生成 Mock 日记
修改标题
选择模板
发布
退出后台
使用私密入口解锁
查看刚发布的回忆
```

每阶段必须执行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

# 26. 项目管理文件

项目根目录必须存在：

```text
PROJECT_SPEC.md
AGENTS.md
TASKS.md
DECISIONS.md
```

---

# 27. AGENTS.md 内容

```md
# Cursor Working Rules

1. 每次修改前阅读 PROJECT_SPEC.md、TASKS.md 和 DECISIONS.md。
2. 一次只实现一个 Phase。
3. 不要擅自更换技术栈。
4. 不要删除已有功能让测试通过。
5. 不使用 any，除非有明确理由。
6. 外部输入使用 Zod。
7. 数据库修改通过 Migration。
8. 原图进 Google Drive（禁止公开分享）；缩略图进 Supabase 私有桶；前台经会话校验后访问。
9. Service Role Key 只能在服务端。
10. AI 输出必须验证。
11. AI 不可自动发布。
12. 没有 AI Key 时使用 Mock Provider。
13. 每完成任务更新 TASKS.md。
14. 架构决定写入 DECISIONS.md。
15. 每阶段运行 lint、typecheck、test、build。
16. 修改保持小而清晰。
17. 不留下无说明 TODO。
18. 不硬编码真实姓名、生日和密码。
19. 所有页面检查手机布局。
20. 不使用未经授权的网络照片。
21. 修复问题时先找根因，不要绕过。
22. 不要把业务逻辑堆在页面组件。
23. 所有敏感环境变量不得进入客户端。
24. 未经用户确认不要开始下一阶段。
```

---

# 28. TASKS.md 模板

```md
# Current Phase

## Todo

- [ ] Task

## In Progress

- [ ] Task

## Completed

- [x] Task

## Validation

- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] production build

## Notes

- None
```

---

# 29. DECISIONS.md 模板

```md
# Architecture Decisions

## Decision 001

Date:
Status:
Context:
Decision:
Reason:
Consequences:
```

---

# 30. 开发阶段

## Phase 0：初始化

完成：

- Next.js TypeScript
- Tailwind
- shadcn/ui
- Framer Motion
- Zod
- 目录结构
- 全局 Token
- 环境变量示例
- Mock 数据
- 项目管理文件
- 基础布局

验收：

- `/`
- `/unlock`
- `/story`
- `/timeline`
- `/letter`
- `/studio`
- `/studio/upload`

全部可打开。

---

## Phase 1：静态 UI

先不连接数据库。

完成：

- 解锁页
- 开场页
- 故事章节
- 时间线
- 回忆详情
- 生日信
- Studio
- 上传流程
- 编辑器
- 至少 5 个模板

必须：

- 手机优先
- Mock 数据
- 本地占位图
- 无 AI Key
- 无 Supabase
- 参考 `docs/design-reference.png`

---

## Phase 2：Supabase

完成：

- Migration
- Auth
- Private thumbnail Storage（Supabase）
- Google Drive GAS 网关骨架（ping / upload / getFile）
- RLS
- Server Client
- Browser Client
- 管理员登录
- Seed

---

## Phase 3：上传

完成：

- 多图上传
- EXIF
- Drive 经 GAS 上传原图
- 缩略图写入 Supabase
- Photos 记录（drive_file_id）
- 自动事件分组
- 失败重试
- HEIC

---

## Phase 4：编辑器

完成：

- 合并
- 拆分
- 排序
- 封面
- 日期
- 地点
- 用户备注
- 自动保存
- 模板预览

---

## Phase 5：AI

完成：

- Provider Adapter
- Mock Provider
- OpenAI Compatible Provider
- Schema
- 提示词
- 错误处理
- 日记版本
- 重新生成
- 事实确认

---

## Phase 6：发布与私密体验

完成：

- 发布流程
- slug
- 解锁 Cookie
- published 内容
- signed URL
- 动态统计
- 前后篇
- 音乐开关

---

## Phase 7：视觉完善

完成：

- 转场
- 照片揭示
- reduced motion
- 加载状态
- 空状态
- 错误状态
- 手机优化
- 字体
- 全屏查看

---

## Phase 8：测试与部署

完成：

- Unit
- Integration
- Playwright
- Vercel
- Production Supabase
- 部署文档
- 备份说明
- 隐私检查

---

# 31. Cursor 第一次执行指令

将以下内容发送给 Cursor Agent：

```text
Read PROJECT_SPEC.md completely before making changes.

You are responsible for implementing Phase 0 only.

Do not start Phase 1 or any later phase.

Tasks:
1. Inspect the current repository.
2. Create AGENTS.md, TASKS.md and DECISIONS.md.
3. Scaffold the recommended folder structure.
4. Configure TypeScript, Tailwind CSS, shadcn/ui, Framer Motion and Zod.
5. Add the global design tokens defined in PROJECT_SPEC.md.
6. Create a basic experience layout and studio layout.
7. Create placeholder routes for:
   /
   /unlock
   /story
   /timeline
   /letter
   /studio
   /studio/upload
8. Add mock navigation between these routes.
9. Add .env.example without real secrets.
10. Add scripts for lint, typecheck, test and build.
11. Update TASKS.md with completed work.
12. Run lint, typecheck, tests and production build.

Important:
- Do not connect Supabase yet.
- Do not add an AI provider yet.
- Do not hardcode private names, birthdays or passwords.
- Do not replace the selected technology stack.
- Keep the implementation clean and production-oriented.
- Report files changed, validation results and decisions made.
```

---

# 32. Cursor 第二次执行指令

Phase 0 完成后发送：

```text
Read PROJECT_SPEC.md, AGENTS.md, TASKS.md and DECISIONS.md.

Implement Phase 1 only.

Use docs/design-reference.png as the main visual reference.

Create polished responsive versions of:
- unlock page
- birthday opening page
- story chapters
- timeline
- memory detail page
- birthday letter
- studio dashboard
- upload flow
- memory editor

Implement at least:
- editorial-hero
- split-story
- polaroid-stack
- three-photo-journal
- full-bleed-quote

Requirements:
- Mobile-first
- Mature romantic visual style
- Dark cinematic opening
- Warm editorial story pages
- Accessible keyboard interactions
- Reduced motion support
- No Supabase
- No real AI API
- No external copyrighted sample photos

Use local abstract placeholders or gradients.

After implementation:
- update TASKS.md
- document UI decisions in DECISIONS.md
- run lint
- run typecheck
- run tests
- run production build

Do not begin Phase 2.
```

---

# 33. Cursor 每阶段回报格式

每次要求 Cursor 回报：

```text
1. Files created
2. Files modified
3. Database migrations added
4. Security implications
5. Tests executed
6. Test results
7. Known limitations
8. Next recommended phase
```

---

# 34. 环境变量示例

`.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GAS_WEB_APP_URL=
GAS_SHARED_SECRET=
GAS_ROOT_FOLDER_ID=

BIRTHDAY_ACCESS_HASH=
SESSION_SIGNING_SECRET=

AI_PROVIDER=mock
AI_MODEL=
AI_API_KEY=
AI_BASE_URL=

NEXT_PUBLIC_APP_NAME=OURS
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh-CN
```

---

# 35. 上线前检查

```text
[ ] Service Role Key 不在客户端
[ ] Git 历史无密码
[ ] Supabase 缩略图桶是 private
[ ] Drive 原图未设为公开分享
[ ] 未登录无法读取照片
[ ] 草稿无法通过 URL 访问
[ ] 缩略图使用 signed URL；原图经服务端代理
[ ] AI 日志不保留原图
[ ] 错误监控不记录密码
[ ] Cookie 为 HttpOnly
[ ] Studio 需要登录
[ ] AI 失败不删除草稿
[ ] 有备份说明
[ ] 手机端测试完成
[ ] 音乐不自动播放
[ ] 删除操作有确认
[ ] lint 通过
[ ] typecheck 通过
[ ] tests 通过
[ ] production build 通过
```

---

# 36. 最终交付标准

系统完成后，应满足：

1. 女朋友可通过私人入口浏览回忆。
2. 未解锁者无法查看。
3. 用户可上传照片。
4. 系统可读取日期和地点。
5. 系统可自动建立事件候选。
6. 用户可补充真实记忆。
7. AI 可生成日记草稿。
8. AI 不会自动发布。
9. 用户可选择不同版式。
10. 发布后自动进入时间线。
11. 手机体验完整。
12. 图片保持私密。
13. 无 AI Key 时可用 Mock 模式演示。
14. Vercel 可稳定部署。
15. Supabase RLS 正常。
16. 测试通过。
