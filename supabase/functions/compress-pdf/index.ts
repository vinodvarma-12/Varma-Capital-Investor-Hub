const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ILOVE_API = "https://api.ilovepdf.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { pdf_base64, filename } = await req.json();
    if (!pdf_base64) {
      return Response.json({ success: false, error: "pdf_base64 is required" }, { status: 400, headers: cors });
    }

    const publicKey = Deno.env.get("ILOVEPDF_PUBLIC_KEY");
    if (!publicKey) {
      return Response.json({ success: false, error: "ILOVEPDF_PUBLIC_KEY secret not configured" }, { status: 500, headers: cors });
    }
    console.log("Using public key (first 20 chars):", publicKey.substring(0, 20));

    // Step 1: Authenticate → get JWT token
    const authRes = await fetch(`${ILOVE_API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey }),
    });
    const authBody = await authRes.text();
    console.log("iLovePDF auth status:", authRes.status, "body:", authBody);
    if (!authRes.ok) throw new Error(`iLovePDF auth failed: ${authRes.status} - ${authBody}`);
    const { token } = JSON.parse(authBody);

    // Step 2: Start compress task → get assigned server + task ID
    const startRes = await fetch(`${ILOVE_API}/start/compress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!startRes.ok) throw new Error(`iLovePDF start failed: ${startRes.status}`);
    const { server, task } = await startRes.json();
    const taskServer = `https://${server}/v1`;

    // Step 3: Upload the PDF
    const pdfBytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const uploadForm = new FormData();
    uploadForm.append("task", task);
    uploadForm.append("file", blob, filename || "document.pdf");

    const uploadRes = await fetch(`${taskServer}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadForm,
    });
    if (!uploadRes.ok) throw new Error(`iLovePDF upload failed: ${uploadRes.status}`);
    const { server_filename } = await uploadRes.json();

    // Step 4: Process (compress)
    const processRes = await fetch(`${taskServer}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        tool: "compress",
        compression_level: "extreme",
        files: [{ server_filename, filename: filename || "document.pdf" }],
      }),
    });
    if (!processRes.ok) {
      const err = await processRes.text();
      throw new Error(`iLovePDF process failed: ${err}`);
    }

    // Step 5: Download compressed PDF
    const downloadRes = await fetch(`${taskServer}/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!downloadRes.ok) throw new Error(`iLovePDF download failed: ${downloadRes.status}`);

    const compressedBuffer = await downloadRes.arrayBuffer();
    const compressedBytes = new Uint8Array(compressedBuffer);

    // Convert to base64 in chunks to avoid stack overflow on large files
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < compressedBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...compressedBytes.subarray(i, i + chunkSize));
    }
    const compressedBase64 = btoa(binary);

    const originalSize = pdfBytes.length;
    const compressedSize = compressedBytes.length;
    const saving = Math.round((1 - compressedSize / originalSize) * 100);

    return Response.json(
      { success: true, pdf_base64: compressedBase64, originalSize, compressedSize, saving },
      { headers: cors }
    );
  } catch (e) {
    console.error("compress-pdf error:", e);
    return Response.json(
      { success: false, error: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
