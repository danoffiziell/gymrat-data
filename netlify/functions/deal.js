exports.handler = async (event, context) => {
  const base = "https://sage-paprenjak-ea3f46.netlify.app";
  const productsUrl = `${base}/products.json`;

  const IOS_APP_STORE_URL = "https://apps.apple.com/app/id6743335261";
  const IOS_TESTFLIGHT_URL = "https://testflight.apple.com/join/DEINCODE"; // später ersetzen

  try {
    const url = new URL(event.rawUrl);

    // 1) key aus Query (?key=...)
    let keyRaw = url.searchParams.get("key") || "";

    // 2) wenn leer: aus Pfad ziehen (/deal/<KEY> oder /d/<KEY>)
    if (!keyRaw) {
      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "deal" || parts[0] === "d") && parts.length >= 2) {
        keyRaw = parts.slice(1).join("/");
      } else {
        keyRaw = parts[parts.length - 1] || "";
      }
    }

    const key = slugify(decodeURIComponent(keyRaw));

    const r = await fetch(productsUrl, { headers: { "cache-control": "no-cache" } });
    if (!r.ok) {
      return {
        statusCode: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: debugHtml("Fetch products.json failed", {
          status: r.status,
          statusText: r.statusText,
          productsUrl,
        }),
      };
    }

    const products = await r.json();
    if (!Array.isArray(products)) {
      return {
        statusCode: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: debugHtml("products.json is not an array", {
          productsUrl,
          type: typeof products,
        }),
      };
    }

    function buildKey(x) {
      const priceFixed = Number(x.price).toFixed(2);
      return slugify(`${x.supermarket}-${x.brand}-${x.name}-${priceFixed}`);
    }

    let p = products.find((x) => buildKey(x) === key);

    if (!p) {
      const keyNoPrice = key.replace(/-\d+-\d+$/, "");
      p = products.find((x) => buildKey(x).startsWith(keyNoPrice));
    }

    if (url.searchParams.get("debug") === "1") {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(
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
      };
    }

    const pageUrl = `${base}/d/${encodeURIComponent(keyRaw)}`;

    const title = p
  ? `${p.name} – ${Number(p.price).toFixed(2)} €`
  : "GymRat Deal";

    const desc = p
      ? `${p.supermarket} · ${Number(p.price).toFixed(2)} €${
          xHas(p, "old_price") && p.old_price != null
            ? ` statt ${Number(p.old_price).toFixed(2)} €`
            : ""
        } · ${p.category} — Mehr Deals in der App`
      : "Protein-Deals & Angebote";

    const image =
      p && p.image_url && String(p.image_url).trim().length > 0
        ? String(p.image_url).trim()
        : `${base}/images/og-default.png`;

    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <title>${escapeHtml(title)}</title>

 <script>
(function () {
  var ua = navigator.userAgent.toLowerCase();

  // ❌ KEIN Redirect für WhatsApp / Facebook / Bots
  if (
    ua.includes("whatsapp") ||
    ua.includes("facebook") ||
    ua.includes("instagram") ||
    ua.includes("slack") ||
    ua.includes("bot")
  ) {
    return;
  }

  var deepLink = "gymrat://deal/${encodeURIComponent(keyRaw)}";
  var testFlight = "${escapeHtml(IOS_TESTFLIGHT_URL)}";
  var appStore = "${escapeHtml(IOS_APP_STORE_URL)}";

  // Erst Deep Link versuchen
  window.location.href = deepLink;

  // Fallback nach kurzer Zeit
  setTimeout(function () {
    var target = (testFlight && testFlight.indexOf("testflight.apple.com") !== -1)
      ? testFlight
      : appStore;
    window.location.href = target;
  }, 1200);
})();
</script>

</head>
<body>
  <noscript>
    <p>Bitte öffne die App oder installiere sie:</p>
    <p><a href="${escapeHtml(IOS_APP_STORE_URL)}">App Store</a></p>
  </noscript>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
      body: html,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: debugHtml("Function crashed", {
        message: String(e?.message || e),
        stack: String(e?.stack || ""),
      }),
    };
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
    .replaceAll(".", "-")
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
