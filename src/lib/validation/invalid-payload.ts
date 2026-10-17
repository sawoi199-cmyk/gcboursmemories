import { NextResponse } from "next/server";
import type { ZodError } from "zod";

type Issue = ZodError["issues"][number];

/** Maps a schema field path (array indexes dropped, e.g. "photoOrder.role") to a Chinese label. */
export type FieldLabels = Record<string, string>;

const MAX_LISTED_ISSUES = 3;

function labelFor(path: Issue["path"], labels: FieldLabels) {
  if (path.length === 0) return labels[""] ?? "请求内容";

  const keys = path.filter((segment): segment is string => typeof segment === "string");
  let label: string | undefined;
  for (let end = keys.length; end > 0 && !label; end -= 1) {
    label = labels[keys.slice(0, end).join(".")];
  }
  label ??= keys.join(".") || "请求内容";

  const index = path.find((segment): segment is number => typeof segment === "number");
  return index === undefined ? label : `${label}第 ${index + 1} 项`;
}

function describeIssue(issue: Issue, labels: FieldLabels) {
  const label = labelFor(issue.path, labels);

  switch (issue.code) {
    case "invalid_type":
      return /received undefined/.test(issue.message) ? `缺少${label}` : `${label}类型不对`;
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.origin === "string") return min <= 1 ? `${label}不能为空` : `${label}至少 ${min} 个字`;
      if (issue.origin === "array") return min <= 1 ? `${label}至少要有一项` : `${label}至少要有 ${min} 项`;
      return `${label}不能小于 ${min}`;
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.origin === "string") return `${label}最多 ${max} 个字`;
      if (issue.origin === "array") return `${label}最多 ${max} 项`;
      return `${label}不能大于 ${max}`;
    }
    case "invalid_format":
      return issue.format === "uuid" ? `${label}不是有效的 ID` : `${label}格式不对`;
    case "invalid_value":
      return `${label}不是可选的值`;
    case "unrecognized_keys":
      return `${label}包含无法识别的字段`;
    default:
      return `${label}不合格`;
  }
}

/** Human-readable Chinese summary of which fields failed, e.g. "提交的内容不合格：标题不能为空". */
export function formatInvalidPayload(error: ZodError, labels: FieldLabels = {}) {
  const details = [...new Set(error.issues.map((issue) => describeIssue(issue, labels)))];
  const listed = details.slice(0, MAX_LISTED_ISSUES).join("；");
  const more = details.length > MAX_LISTED_ISSUES ? `；等 ${details.length} 处` : "";
  return `提交的内容不合格：${listed}${more}`;
}

export function invalidPayloadResponse(error: ZodError, labels: FieldLabels = {}) {
  return NextResponse.json(
    { ok: false, message: formatInvalidPayload(error, labels) },
    { status: 400 },
  );
}
