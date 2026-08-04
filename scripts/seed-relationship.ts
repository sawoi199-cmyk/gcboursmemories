/**
 * Optional seed helper.
 *
 * Usage:
 *   1. Apply supabase/migrations/20260804000000_init.sql
 *   2. Create an Auth user in Supabase Dashboard
 *   3. Set .env.local with URL + SERVICE_ROLE_KEY + SEED_OWNER_ID
 *   4. npx tsx scripts/seed-relationship.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerId = process.env.SEED_OWNER_ID;

async function main() {
  if (!url || !serviceKey || !ownerId) {
    console.error(
      "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_OWNER_ID.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tags = [
    { name: "日常", category: "activity" },
    { name: "旅行", category: "activity" },
    { name: "庆祝", category: "activity" },
    { name: "食物", category: "food" },
    { name: "地点", category: "place" },
    { name: "夜晚", category: "mood" },
    { name: "温暖", category: "mood" },
  ];

  const { error: tagsError } = await supabase.from("memory_tags").upsert(tags, {
    onConflict: "name",
  });
  if (tagsError) {
    throw tagsError;
  }

  const { error: settingsError } = await supabase.from("relationship_settings").upsert(
    {
      owner_id: ownerId,
      relationship_title: "OURS",
      partner_name: "乖宝",
      owner_name: "臭宝",
      relationship_start_date: "2024-12-20",
      unlock_title: "PERSONAL MEMORY ARCHIVE",
      unlock_hint: "Enter the date only we remember.",
      default_diary_tone: "warm",
      default_language: "zh-CN",
    },
    { onConflict: "owner_id" },
  );
  if (settingsError) {
    throw settingsError;
  }

  const { count } = await supabase
    .from("letters")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if (!count) {
    const { error: letterError } = await supabase.from("letters").insert({
      owner_id: ownerId,
      title: "写给你的一封信",
      body: "这个档案没有最后一页。\n\n因为往后的每一次出门、\n每一顿饭、每一次旅行，\n都会成为我们一起写下的新章节。\n\n那些平凡却闪闪发亮的点点滴滴，\n我都会好好收藏在这里。\n\n我们会继续一起生活，\n一起创造新的回忆，\n把属于我们的故事，\n慢慢写成一本没有结局的书。\n\n生日快乐。\n谢谢你来到我的生命里，\n也谢谢你愿意陪我一起，把未来写下去。",
      letter_date: "2026-09-14",
      status: "draft",
    });
    if (letterError) {
      throw letterError;
    }
  }

  console.log("Seed complete for owner", ownerId);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
