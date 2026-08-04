/**
 * OURS Drive Gateway — Google Apps Script
 *
 * Deploy:
 * 1. script.google.com → New project → paste this file
 * 2. Project Settings → Script properties:
 *      OURS_SHARED_SECRET = <same as GAS_SHARED_SECRET in .env.local>
 *      OURS_ROOT_FOLDER_ID = <optional Drive folder id for "OURS">
 * 3. Deploy → New deployment → Type: Web app
 *      Execute as: Me
 *      Who has access: Anyone  (auth is enforced by shared secret; do NOT skip the secret check)
 * 4. Copy the Web App URL into GAS_WEB_APP_URL
 *
 * Security:
 * - Always require X-Ours-Secret / body.secret matching Script Properties
 * - Never make Drive files "Anyone with the link"
 */

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty("OURS_SHARED_SECRET") || "";
}

function getRootFolderId_(requestRootId) {
  return (
    requestRootId ||
    PropertiesService.getScriptProperties().getProperty("OURS_ROOT_FOLDER_ID") ||
    ""
  );
}

function assertSecret_(e) {
  var expected = getSecret_();
  if (!expected) {
    throw new Error("OURS_SHARED_SECRET is not set in Script Properties.");
  }

  var headerSecret = "";
  if (e && e.headers) {
    headerSecret = e.headers["X-Ours-Secret"] || e.headers["x-ours-secret"] || "";
  }

  var body = {};
  if (e && e.postData && e.postData.contents) {
    body = JSON.parse(e.postData.contents);
  }

  var provided = headerSecret || body.secret || "";
  if (provided !== expected) {
    throw new Error("Unauthorized");
  }

  return body;
}

function json_(payload, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getOrCreateChildFolder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

function resolveUploadFolder_(rootFolderId, folderKey) {
  if (!rootFolderId) {
    throw new Error("rootFolderId missing. Set GAS_ROOT_FOLDER_ID or Script Property OURS_ROOT_FOLDER_ID.");
  }
  var root = DriveApp.getFolderById(rootFolderId);
  var originals = getOrCreateChildFolder_(root, "originals");
  var audio = getOrCreateChildFolder_(root, "audio");
  if (folderKey === "audio") {
    return audio;
  }
  return originals;
}

function doGet() {
  return json_({
    ok: true,
    action: "info",
    message: "OURS Drive Gateway. Use POST with shared secret.",
  });
}

function doPost(e) {
  try {
    var body = assertSecret_(e);
    var action = body.action || "ping";
    var rootFolderId = getRootFolderId_(body.rootFolderId);

    if (action === "ping") {
      return json_({
        ok: true,
        action: "ping",
        message: "pong",
        folderId: rootFolderId || undefined,
      });
    }

    if (action === "ensureFolders") {
      var root = DriveApp.getFolderById(rootFolderId);
      var originals = getOrCreateChildFolder_(root, "originals");
      getOrCreateChildFolder_(root, "audio");
      return json_({
        ok: true,
        action: "ensureFolders",
        folderId: originals.getId(),
        message: "Folders ready",
      });
    }

    if (action === "upload") {
      if (!body.filename || !body.mimeType || !body.base64) {
        throw new Error("filename, mimeType and base64 are required.");
      }
      var folder = resolveUploadFolder_(rootFolderId, body.folder || "originals");
      var blob = Utilities.newBlob(
        Utilities.base64Decode(body.base64),
        body.mimeType,
        body.filename,
      );
      var file = folder.createFile(blob);
      // Keep private — do not set sharing to anyone
      return json_({
        ok: true,
        action: "upload",
        fileId: file.getId(),
        folderId: folder.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        sizeBytes: file.getSize(),
      });
    }

    if (action === "getFile") {
      if (!body.fileId) {
        throw new Error("fileId is required.");
      }
      var fileToRead = DriveApp.getFileById(body.fileId);
      var bytes = fileToRead.getBlob().getBytes();
      return json_({
        ok: true,
        action: "getFile",
        fileId: fileToRead.getId(),
        name: fileToRead.getName(),
        mimeType: fileToRead.getMimeType(),
        sizeBytes: fileToRead.getSize(),
        base64: Utilities.base64Encode(bytes),
      });
    }

    if (action === "deleteFile") {
      if (!body.fileId) {
        throw new Error("fileId is required.");
      }
      try {
        DriveApp.getFileById(body.fileId).setTrashed(true);
      } catch (err) {
        var msg = String(err && err.message ? err.message : err);
        // Already gone / not found → success for idempotent cleanup
        if (msg.indexOf("not found") === -1 && msg.indexOf("No item") === -1) {
          throw err;
        }
      }
      return json_({
        ok: true,
        action: "deleteFile",
        fileId: body.fileId,
      });
    }

    throw new Error("Unknown action: " + action);
  } catch (err) {
    return json_({
      ok: false,
      message: String(err && err.message ? err.message : err),
    });
  }
}
