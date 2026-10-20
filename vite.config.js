import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

function localWarehouseLightboxPlugin() {
  const rootDir = process.cwd();
  const cataloguesDir = path.join(rootDir, "public", "catalogues");
  const uploadsDir = path.join(cataloguesDir, "uploads");
  const draftsFile = path.join(cataloguesDir, "lightbox-captures.json");

  function readDrafts() {
    try {
      if (!fs.existsSync(draftsFile)) return [];
      return JSON.parse(fs.readFileSync(draftsFile, "utf8")) || [];
    } catch {
      return [];
    }
  }

  function writeDrafts(list) {
    fs.mkdirSync(cataloguesDir, { recursive: true });
    fs.writeFileSync(draftsFile, JSON.stringify(list, null, 2), "utf8");
  }

  return {
    name: "decorbeats-local-warehouse-lightbox",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__local_capture/")) return next();

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        const collectBody = () =>
          new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            req.on("error", reject);
          });

        try {
          if (req.url.startsWith("/__local_capture/drafts") && req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ drafts: readDrafts() }));
            return;
          }

          if (req.url.startsWith("/__local_capture/save-draft") && req.method === "POST") {
            const raw = await collectBody();
            const payload = JSON.parse(raw || "{}");
            const draft = payload.draft;
            if (!draft || !draft.id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing draft id" }));
              return;
            }
            const list = readDrafts();
            const now = new Date().toISOString();
            const saved = {
              ...draft,
              revision: (Number(draft.revision) || 0) + 1,
              status: draft.status || "draft",
              updated_at: now,
              created_at: draft.created_at || now
            };
            const nextList = [saved, ...list.filter((x) => x.id !== saved.id)];
            writeDrafts(nextList);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ draft: saved }));
            return;
          }

          if (req.url.startsWith("/__local_capture/upload-photo") && req.method === "POST") {
            const raw = await collectBody();
            const { draftId, shot, dataUrl, filename, width, height } = JSON.parse(raw || "{}");
            if (!dataUrl || !dataUrl.startsWith("data:")) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid image dataUrl" }));
              return;
            }
            const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            const mime = matches?.[1] || "image/webp";
            const base64 = matches?.[2] || "";
            const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
            fs.mkdirSync(uploadsDir, { recursive: true });
            const safeName = `${draftId || "item"}-${shot || "hero"}-${Date.now()}.${ext}`.replace(
              /[^a-zA-Z0-9._-]/g,
              "-"
            );
            const filePath = path.join(uploadsDir, safeName);
            const buf = Buffer.from(base64, "base64");
            fs.writeFileSync(filePath, buf);
            const publicUrl = `/catalogues/uploads/${safeName}`;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                asset: {
                  url: publicUrl,
                  original: publicUrl,
                  filename: filename || safeName,
                  width: width || 1600,
                  height: height || 1600,
                  bytes: buf.length,
                  warning: ""
                }
              })
            );
            return;
          }
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message || "Local capture error" }));
          return;
        }

        return next();
      });
    }
  };
}

export default defineConfig({
  plugins: [localWarehouseLightboxPlugin()],
  server: {
    host: true,
    port: 4173
  }
});
