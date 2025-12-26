export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";

    const productsUrl = "https://sage-paprenjak-ea3f46.netlify.app/products.json";
    const r = await fetch(productsUrl, { headers: { "cache-control": "no-cache" } });
    const products = await r.json();

    const p = products.find(x =>
      slugify(`${x.supermarket}-${x.brand}-${x.name}-${Number(x.price).toFixed(2)}`) === key
    );

    const base = "https://sage-paprenjak-ea3f46.netlify.app";
    const pageUrl = `${base}/deal/${encodeURIComponent(key)}`;

    const title = p ? `GymRat Deal 🔥 ${p.name}` : "GymRat Deal 🔥";
    const desc = p
      ? `${p.supermarket} · ${Number(p.price).toFixed(2)} € · ${p.category}`
      : "Protein-Deals & Angebote";

    const image = (p && p.image_url && String(p.image_url).trim().length > 0)
      ? String(p.image_url).trim()
      : `${base}/images/og-default.png`; // optionaler Fallback

    // Für Browser: erstmal einfach zu products.json weiterleiten
    const redirectTo = `${base}/products.json`;

    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />

  <title>${escapeHtml(title)}</title>
  <meta http-equiv="refresh" content="0; url=${escapeHtml(redirectTo)}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

