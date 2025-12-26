export default async (req, context) => {
  const base = "https://sage-paprenjak-ea3f46.netlify.app";
  const productsUrl = `${base}/products.json`;

  try {
    const url = new URL(req.url);
    const keyRaw = url.searchParams.get("key") || "";
    const key = slugify(keyRaw);

    const r = await fetch(productsUrl, { headers: { "cache-control": "no-cache" } });
    if (!r.ok) {
      return new Response(
        debugHtml("Fetch products.json failed", {
          status: r.status,
          statusText: r.statusText,
          productsUrl,
        }),
        { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    const products = await r.json();
    if (!Array.isArray(products)) {
      return new Response(
        debugHtml("products.json is not an array", {
          productsUrl,
          type: typeof products,
        }),
        { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

function buildKey(x) {
  const priceFixed = Number(x.price).toFixed(2); // 1.99
  return slugify(`${x.supermarket}-${x.brand}-${x.name}-${priceFixed}`);
}


// 1) exakter Match
let p = products.find((x) => buildKey(x) === key);

// 2) Fallback: manche Keys sind ohne Preis oder mit anderem Preisformat → toleranter Match
if (!p) {
  const keyNoPrice = key.replace(/-\d+-\d+$/, ""); // ...-1-99 weg
  p = products.find((x) => buildKey(x).startsWith(keyNoPrice));
}

if (url.searchParams.get("debug") === "1") {
  return new Response(
    JSON.stringify(
      {
        keyRaw,
        normalizedKey: key,
        found: !!p,
        foundName: p?.name || null,
        foundImage: p?.image_url || null,
      },
      null,
      2
    ),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

    const pageUrl = `${base}/deal/${encodeURIComponent(keyRaw)}`;

    const title = p ? `GymRat Deal 🔥 ${p.name}` : "GymRat Deal 🔥";
    const desc = p
      ? `${p.supermarket} · ${Number(p.price).toFixed(2)} €${
          xHas(p, "old_price") && p.old_price != null
            ? ` statt ${Number(p.old_price).toFixed(2)} €`
            : ""
        } · ${p.category}`
      : "Protein-Deals & Angebote";

    const image =
      p && p.image_url && String(p.image_url).trim().length > 0
        ? String(p.image_url).trim()
        : `${base}/images/og-default.png`;

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
    return new Response(
      debugHtml("Function crashed", {
        message: String(e?.message || e),
        stack: String(e?.stack || ""),
        productsUrl,
      }),
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
};

function xHas(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replaceAll(".", "-") // 1.99 -> 1-99
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debugHtml(title, data) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family: -apple-system, system-ui; padding: 20px;">
  <h2>${escapeHtml(title)}</h2>
  <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
</body></html>`;
}
