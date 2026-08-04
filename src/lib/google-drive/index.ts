export {
  ensureDriveFolders,
  fetchDriveFile,
  getDriveConfigStatus,
  getDriveConnectionStatus,
  getDriveRootFolderId,
  getGasSharedSecret,
  getGasWebAppUrl,
  isDriveConfigured,
  pingDriveGateway,
  uploadDriveFile,
} from "@/lib/google-drive/gas-client";

export const googleDrivePaths = {
  originalsFolder: "OURS/originals",
  audioFolder: "OURS/audio",
} as const;
