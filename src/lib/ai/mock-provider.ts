import type { AIProvider, MemoryAnalysisInput, MemoryAnalysisResult } from "@/lib/ai/types";

export class MockAIProvider implements AIProvider {
  async analyzeMemory(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult> {
    const note = input.userNote.trim();
    const place = input.eventMetadata.placeName;
    const date = input.eventMetadata.eventDate;
    const chapter = input.eventMetadata.chapter;

    const diaryBody = [
      note ? note : `${date} 这一天被放进了我们的档案。`,
      place ? `地点写着：${place}。不确定的细节先不编造。` : "地点若还不清楚，就先留白。",
      chapter ? `这一段落在「${chapter}」章节附近。` : null,
      "光线、脚步和并肩的片刻，比任何漂亮句子都更值得保存。",
      input.excludedDetails
        ? "按你的要求，敏感内容没有写进正文。"
        : "如果有需要确认的地方，会列在问题里。",
      "这是一份草稿，等你改完再决定要不要发布。",
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n")
      .slice(0, 3000);

    const padded =
      diaryBody.length >= 50
        ? diaryBody
        : `${diaryBody}\n\n我们把这一天轻轻放好，留给以后慢慢回看。`;

    const eventTitle = place ? `${place}·${date.slice(5)}` : `${date} 的记录`;
    const emotionTitle = note.includes("笑")
      ? "笑意落在路灯里"
      : note.includes("雨")
        ? "雨声里的并肩"
        : "把这一天轻轻放好";
    const detailTitle = note
      ? note.slice(0, 24) || "记得这一处细节"
      : place
        ? `关于${place}的一页`
        : "记得这一处细节";

    const recommendedTitle =
      input.preserveTitle && input.currentTitle
        ? input.currentTitle
        : note
          ? detailTitle
          : eventTitle;

    const oneLine =
      input.preserveOneLine && input.currentOneLine
        ? input.currentOneLine
        : note
          ? note.slice(0, 160)
          : "有些瞬间不需要修饰，记下来就够了。";

    const questionsToConfirm: string[] = [];
    if (!place) questionsToConfirm.push("这一天的地点要写成哪里？");
    if (!note) questionsToConfirm.push("想补一句当天真实发生的事吗？");

    const factsUsed = [
      `日期：${date}`,
      place ? `地点：${place}` : null,
      note ? `备注：${note.slice(0, 80)}` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      titleCandidates: [
        { kind: "event", text: eventTitle.slice(0, 80) },
        { kind: "emotion", text: emotionTitle.slice(0, 80) },
        { kind: "detail", text: detailTitle.slice(0, 80) },
      ],
      recommendedTitle: recommendedTitle.slice(0, 80) || eventTitle,
      oneLine: oneLine.slice(0, 160) || "有些瞬间不需要修饰，记下来就够了。",
      diaryBody:
        input.mode === "title_only" && input.currentDiaryBody && input.currentDiaryBody.length >= 50
          ? input.currentDiaryBody.slice(0, 3000)
          : padded,
      factsUsed,
      inferredFacts: note
        ? [`用户备注提到：${note.slice(0, 80)}`]
        : ["仅有日期与照片元数据，正文偏克制"],
      questionsToConfirm: questionsToConfirm.slice(0, 5),
      confidence: note ? 0.72 : 0.45,
    };
  }
}
