import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const apiKey = Deno.env.get("GHL_API_KEY");
  const locationId = Deno.env.get("GHL_LOCATION_ID");

  if (!apiKey || !locationId) {
    return Response.json({ error: "GHL credentials not configured" }, { status: 500, headers: cors });
  }

  // Media / docs endpoints use 2021-07-28
  const ghlHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Version": "2021-07-28",
    "Accept": "application/json",
  };

  // blogs/site/all works on 2023-02-21
  const ghlHeadersV2 = {
    "Authorization": `Bearer ${apiKey}`,
    "Version": "2023-02-21",
    "Accept": "application/json",
  };

  // blogs/posts/all requires v3
  const ghlHeadersV3 = {
    "Authorization": `Bearer ${apiKey}`,
    "Version": "v3",
    "Accept": "application/json",
  };

  try {
    const files: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();
    const warnings: Record<string, unknown>[] = [];

    const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

    const extractItems = (json: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = json[key];
        if (Array.isArray(value)) return value as Record<string, unknown>[];
      }
      return [];
    };

    const safeJson = async (res: Response) => {
      try {
        return await res.json() as Record<string, unknown>;
      } catch {
        return {};
      }
    };

    const addMediaFiles = (rawMedia: Record<string, unknown>[]) => {
      for (const f of rawMedia) {
        const id = String(f._id ?? f.id ?? f.url ?? "");
        if (seenIds.has(id)) continue;
        // Skip raw image files — they clutter the UI
        const ext = String(f.name ?? "").split(".").pop()?.toLowerCase() ?? "";
        if (IMAGE_EXTS.includes(ext)) continue;
        seenIds.add(id);
        files.push({
          id,
          name: f.name,
          url: f.url,
          type: f.fileType ?? f.type ?? "file",
          size: f.size ?? null,
          created_at: f.createdAt ?? null,
          thumbnail: f.thumbnailUrl ?? null,
          source: "media",
        });
      }
    };

    // Fetch media files, folders, and documents in parallel
    const [rootFilesRes, foldersRes, docsRes] = await Promise.all([
      fetch(`https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=file`, { headers: ghlHeaders }),
      fetch(`https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=folder`, { headers: ghlHeaders }),
      fetch(`https://services.leadconnectorhq.com/proposals/document?locationId=${locationId}`, { headers: ghlHeaders }),
    ]);

    if (rootFilesRes.ok) {
      const json = await rootFilesRes.json();
      addMediaFiles(extractItems(json, ["files", "medias", "data"]));
    }

    if (foldersRes.ok) {
      const foldersJson = await foldersRes.json();
      const folders = extractItems(foldersJson, ["files", "medias", "data"]);
      const folderFileResults = await Promise.allSettled(
        (folders as Record<string, unknown>[]).map(folder => {
          const folderId = folder._id ?? folder.id;
          return fetch(
            `https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=file&parentId=${folderId}`,
            { headers: ghlHeaders }
          ).then(r => r.ok ? r.json() : null);
        })
      );
      for (const result of folderFileResults) {
        if (result.status !== "fulfilled" || !result.value) continue;
        addMediaFiles(extractItems(result.value, ["files", "medias", "data"]));
      }
    }

    if (docsRes.ok) {
      const docsJson = await docsRes.json();
      const rawDocs = extractItems(docsJson, ["documents", "data"]);
      for (const d of rawDocs) {
        const docUrl = d.viewUrl ?? d.url ?? d.previewUrl ?? null;
        if (!docUrl) continue;
        files.push({
          id: d._id ?? d.id,
          name: d.title ?? d.name ?? "Untitled Document",
          url: docUrl,
          type: "document",
          size: null,
          created_at: d.createdAt ?? d.dateCreated ?? null,
          thumbnail: d.previewUrl ?? null,
          source: "documents",
        });
      }
    }

    // Fetch blog sites (2023-02-21), then posts per site (v3)
    const blogsRes = await fetch(
      `https://services.leadconnectorhq.com/blogs/site/all?locationId=${locationId}&limit=100&skip=0`,
      { headers: ghlHeadersV2 }
    );

    if (blogsRes.ok) {
      const blogsJson = await blogsRes.json() as Record<string, unknown>;
      const sites = extractItems(blogsJson, ["data", "blogs", "sites"]);
      const blogBaseDomain = Deno.env.get("GHL_BLOG_DOMAIN") ?? "https://varmacapital.io";

      const postUrls = sites.flatMap(site => {
        const siteId = site._id ?? site.id;
        if (!siteId) return [];
        return [`https://services.leadconnectorhq.com/blogs/posts/all?locationId=${locationId}&blogId=${siteId}&limit=10&offset=0&status=ALL`];
      });

      const postsResults = await Promise.allSettled(
        postUrls.map(url =>
          fetch(url, { headers: ghlHeadersV3 }).then(async r => ({
            _url: url,
            _status: r.status,
            _json: r.ok ? await safeJson(r) : null,
            _error: r.ok ? null : await r.text(),
          }))
        )
      );

      for (const result of postsResults) {
        if (result.status === "rejected") {
          warnings.push({ source: "blog", error: String(result.reason) });
          continue;
        }
        if (!result.value._json) {
          warnings.push({
            source: "blog",
            status: result.value._status,
            url: result.value._url.replace(apiKey, "[redacted]"),
            error: result.value._error,
          });
          continue;
        }
        const posts = extractItems(result.value._json, ["blogs", "posts", "data"]);

        for (const p of posts) {
          const slug = p.urlSlug ?? p.slug ?? null;
          const rawUrl = p.canonicalLink ?? p.url ?? null;
          const resolvedUrl = rawUrl && String(rawUrl).startsWith("http")
            ? String(rawUrl)
            : slug ? `${blogBaseDomain}/post/${slug}` : null;

          const id = String(p._id ?? p.id ?? Math.random());
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          files.push({
            id,
            name: p.title ?? "Untitled Post",
            url: resolvedUrl,
            type: "blog",
            size: null,
            created_at: p.publishedAt ?? p.updatedAt ?? null,
            thumbnail: p.imageUrl ?? p.featuredImage ?? p.thumbnail ?? null,
            description: p.description ?? p.metaDescription ?? p.excerpt ?? null,
            source: "blog",
          });
        }
      }
    } else {
      warnings.push({
        source: "blog-sites",
        status: blogsRes.status,
        error: await blogsRes.text(),
      });
    }

    return Response.json({ success: true, data: files, warnings }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to fetch GHL materials", details: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
