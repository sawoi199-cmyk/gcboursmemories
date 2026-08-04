import { z } from "zod";

const GasResponseSchema = z.object({
  ok: z.boolean(),
  action: z.string().optional(),
  message: z.string().optional(),
  fileId: z.string().optional(),
  folderId: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  base64: z.string().optional(),
});

export type GasResponse = z.infer<typeof GasResponseSchema>;

export type DriveConnectionStatus = {
  gasUrlConfigured: boolean;
  sharedSecretConfigured: boolean;
  rootFolderConfigured: boolean;
  reachable: boolean;
  message: string;
};

export function isDriveConfigured() {
  return Boolean(process.env.GAS_WEB_APP_URL && process.env.GAS_SHARED_SECRET);
}

export function getGasWebAppUrl() {
  const url = process.env.GAS_WEB_APP_URL;
  if (!url) {
    throw new Error("GAS_WEB_APP_URL is not configured.");
  }
  return url;
}

export function getGasSharedSecret() {
  const secret = process.env.GAS_SHARED_SECRET;
  if (!secret) {
    throw new Error("GAS_SHARED_SECRET is not configured.");
  }
  return secret;
}

export function getDriveRootFolderId() {
  return process.env.GAS_ROOT_FOLDER_ID ?? null;
}

async function callGas(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<GasResponse> {
  const response = await fetch(getGasWebAppUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ours-Secret": getGasSharedSecret(),
    },
    body: JSON.stringify({
      action,
      secret: getGasSharedSecret(),
      rootFolderId: getDriveRootFolderId() ?? undefined,
      ...payload,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GAS request failed with HTTP ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = GasResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GAS returned an unexpected payload.");
  }

  if (!parsed.data.ok) {
    throw new Error(parsed.data.message ?? "GAS action failed.");
  }

  return parsed.data;
}

/** Lightweight connectivity check used by Settings / status API. */
export async function pingDriveGateway() {
  return callGas("ping");
}

/** Ensure OURS/originals and OURS/audio exist under the root folder. */
export async function ensureDriveFolders() {
  return callGas("ensureFolders");
}

/**
 * Upload a file as base64 through GAS.
 * Suitable for Phase 3 moderate-size originals; very large files may need chunking later.
 */
export async function uploadDriveFile(input: {
  filename: string;
  mimeType: string;
  base64: string;
  folder?: "originals" | "audio";
}) {
  return callGas("upload", {
    filename: input.filename,
    mimeType: input.mimeType,
    base64: input.base64,
    folder: input.folder ?? "originals",
  });
}

/** Fetch file metadata + base64 content for server-side image proxy. */
export async function fetchDriveFile(fileId: string) {
  return callGas("getFile", { fileId });
}

export async function getDriveConfigStatus(): Promise<DriveConnectionStatus> {
  const gasUrlConfigured = Boolean(process.env.GAS_WEB_APP_URL);
  const sharedSecretConfigured = Boolean(process.env.GAS_SHARED_SECRET);
  const rootFolderConfigured = Boolean(process.env.GAS_ROOT_FOLDER_ID);

  if (!gasUrlConfigured || !sharedSecretConfigured) {
    return {
      gasUrlConfigured,
      sharedSecretConfigured,
      rootFolderConfigured,
      reachable: false,
      message:
        "请配置 GAS_WEB_APP_URL 与 GAS_SHARED_SECRET。在 script.google.com 部署网关后填入 .env.local，无需在 Studio 授权。",
    };
  }

  return {
    gasUrlConfigured,
    sharedSecretConfigured,
    rootFolderConfigured,
    // Not probed here — live ping is slow (GAS cold start). Use /api/drive/status on demand.
    reachable: false,
    message: rootFolderConfigured
      ? "环境变量已配置。连通性请点下方「检查连通性」确认（会请求 GAS，可能需几秒）。"
      : "环境变量已配置。建议设置 GAS_ROOT_FOLDER_ID。连通性请点「检查连通性」确认。",
  };
}

export async function getDriveConnectionStatus(): Promise<DriveConnectionStatus> {
  const base = await getDriveConfigStatus();

  if (!base.gasUrlConfigured || !base.sharedSecretConfigured) {
    return base;
  }

  try {
    await pingDriveGateway();
    return {
      ...base,
      reachable: true,
      message: base.rootFolderConfigured
        ? "GAS Drive 网关可达，可用于上传。"
        : "GAS 网关可达。建议设置 GAS_ROOT_FOLDER_ID（OURS 根文件夹 ID）。",
    };
  } catch (error) {
    return {
      ...base,
      reachable: false,
      message:
        error instanceof Error
          ? `GAS 不可达：${error.message}`
          : "GAS 不可达，请检查 Web App URL、部署权限与共享密钥。",
    };
  }
}
