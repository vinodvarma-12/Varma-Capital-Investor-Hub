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

  const ghlHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Version": "2021-07-28",
    "Accept": "application/json",
  };

  // Blogs API requires version 2023-02-21
  const ghlHeadersV2 = {
    "Authorization": `Bearer ${apiKey}`,
    "Version": "2023-02-21",
    "Accept": "application/json",
  };

  try {
    const files: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();

    const addMediaFiles = (rawMedia: Record<string, unknown>[]) => {
      for (const f of rawMedia) {
        const id = String(f._id ?? f.id ?? f.url ?? "");
        if (seenIds.has(id)) continue;
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

    // Step 1: Fetch root-level files and folders together
    const [rootFilesRes, foldersRes, docsRes] = await Promise.all([
      fetch(`https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=file`, { headers: ghlHeaders }),
      fetch(`https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=folder`, { headers: ghlHeaders }),
      fetch(`https://services.leadconnectorhq.com/proposals/document?locationId=${locationId}`, { headers: ghlHeaders }),
    ]);

    // Root-level files
    if (rootFilesRes.ok) {
      const json = await rootFilesRes.json();
      addMediaFiles(json.files ?? json.medias ?? json.data ?? []);
    }

    // Step 2: For each folder, fetch its files
    if (foldersRes.ok) {
      const foldersJson = await foldersRes.json();
      const folders = foldersJson.files ?? foldersJson.medias ?? foldersJson.data ?? [];

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
        const json = result.value;
        addMediaFiles(json.files ?? json.medias ?? json.data ?? []);
      }
    }

    // Documents & Contracts
    if (docsRes.ok) {
      const docsJson = await docsRes.json();
      const rawDocs = docsJson.documents ?? docsJson.data ?? [];
      for (const d of rawDocs as Record<string, unknown>[]) {
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

    // Blog posts via GHL API
    const blogsRes = await fetch(
      `https://services.leadconnectorhq.com/blogs/site/all?locationId=${locationId}&limit=20&skip=0`,
      { headers: ghlHeadersV2 }
    );

    if (blogsRes.ok) {
      const blogsJson = await blogsRes.json();
      const blogs = blogsJson.blogs ?? blogsJson.data ?? blogsJson.sites ?? blogsJson.results ?? [];

      const postsResults = await Promise.allSettled(
        (blogs as Record<string, unknown>[]).map((blog) => {
          const blogId = blog._id ?? blog.id;
          const blogDomain = blog.domain ?? blog.url ?? null;
          const postsUrl = `https://services.leadconnectorhq.com/blogs/posts/all?locationId=${locationId}&blogId=${blogId}&limit=50&offset=0&status=PUBLISHED`;
          return fetch(postsUrl, { headers: ghlHeadersV2 })
            .then(async r => {
              const j = r.ok ? await r.json() : null;
              return j ? { ...j, _blogDomain: blogDomain } : null;
            });
        })
      );

      for (const result of postsResults) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const json = result.value as Record<string, unknown>;
        const blogDomain = json._blogDomain as string | null;
        const posts = json.posts ?? json.blogs ?? json.data ?? [];
        for (const p of posts as Record<string, unknown>[]) {
          const slug = p.slug ?? p.urlSlug ?? null;
          const blogBaseDomain = Deno.env.get("GHL_BLOG_DOMAIN") ?? "https://www.varmacapital.io";
          const rawUrl = p.url ?? p.canonicalLink ?? null;
          const resolvedUrl = rawUrl
            ? (rawUrl.startsWith("http") ? rawUrl : `${blogBaseDomain}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`)
            : (slug ? `${blogBaseDomain}/post/${slug}` : null);
          const postUrl = resolvedUrl;

          const id = String(p._id ?? p.id ?? p.title ?? Math.random());
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          files.push({
            id,
            name: p.title ?? "Untitled Post",
            url: postUrl,
            type: "blog",
            size: null,
            created_at: p.publishedAt ?? p.createdAt ?? null,
            thumbnail: p.imageUrl ?? p.featuredImage ?? p.image ?? null,
            description: p.description ?? p.excerpt ?? p.metaDescription ?? null,
            source: "blog",
          });
        }
      }
    }

    return Response.json({ success: true, data: files }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to fetch GHL materials", details: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
