export default async (req) => {
  const MODEL = "gemini-3.8-flash";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  try {
    if (req.method !== "POST") return new Response("OK");
    const key = Netlify.env.get("GEMINI_API_KEY");
    if (!key) return new Response("KEY MISSING", { status: 500 });

    const ask = (text, temp) =>
      fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseMimeType: "application/json", temperature: temp },
        }),
      });
    const parse = async (r) => {
      const data = await r.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    };

    const b = await req.json();
    const cut = (v, n) => String(v ?? "").slice(0, n);
    const city = cut(b.city, 60).trim();
    if (!city) return new Response("City required", { status: 400 });
    const tier = ["budget", "mid", "comfort"].includes(b.tier) ? b.tier : "mid";

    // "Load more" mode
    if (b.section) {
      const kinds = {
        pl: 'places to visit (attractions, landmarks, parks, markets, museums, viewpoints). Shape: ["Name","one-line description","heritage|nature|shopping|fun","emoji"]',
        fd: 'famous dishes, restaurants and food spots. Shape: ["Name","one-line description","food","emoji"]',
        st: 'places to stay (hotels, resorts, hostels, homestays) fitting the ' + tier + ' budget. Shape: ["Name","approx price per night in INR","emoji"]',
      };
      if (!kinds[b.section]) return new Response("Bad section", { status: 400 });
      const have = (Array.isArray(b.have) ? b.have : []).slice(0, 100).map((x) => cut(x, 80)).join("; ");
      const r = await ask(
        `List 15 more ${kinds[b.section]} in "${city}". Do NOT repeat any of these: ${have}.
Return ONLY JSON: {"items":[ ...15 arrays in that shape... ]}. Only real places.`, 0.6);
      if (!r.ok) return new Response("AI error " + r.status, { status: 502 });
      const j = await parse(r);
      return new Response(JSON.stringify({ items: Array.isArray(j.items) ? j.items : [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const origin = cut(b.origin, 60), from = cut(b.from, 10), to = cut(b.to, 10);
    const interest = cut(b.interest, 30);

    const prompt = `You are a travel guide writer. Make a trip guide for "${city}".
Dates: ${from} to ${to}. Travelling from: ${origin || "not given"}. Budget tier: ${tier}. Main interest: ${interest || "general"}.
If "${city}" is not a real place, return {"error":"unknown place"}.
Return ONLY JSON in exactly this shape:
{"n":"City name","e":"one emoji","sum":"2 sentences about the place","story":"4-5 sentences on the history or main story of the place","best":"best months to visit",
"pl":[["Place name","one-line description","heritage|nature|food|shopping|fun","emoji"]],
"fd":[["Dish or restaurant","one-line description","food","emoji"]],
"st":[["Stay type or area","approx price per night in INR","emoji"]],
"tr":"how to get there from the origin and get around locally",
"perDay":approx total cost per person per day in INR for the ${tier} tier}
Give 15 places, 10 foods, 5 stays that fit the ${tier} budget. Put the main interest first. Prices are estimates.`;

    const r = await ask(prompt, 0.6);
    if (!r.ok) return new Response("AI error " + r.status, { status: 502 });
    const guide = await parse(r);
    if (guide.error) return new Response("Unknown place", { status: 404 });
    return new Response(JSON.stringify(guide), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response("Function error: " + e.message, { status: 500 });
  }
};
