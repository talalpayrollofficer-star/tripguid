export default async (req) => {
  const MODEL = "gemini-3.8-flash";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  try {
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

    if (req.method === "GET") {
      const t = await ask('Reply with JSON {"ok":true}', 0);
      return new Response("Gemini status " + t.status + ": " + (await t.text()).slice(0, 400));
    }

    const b = await req.json();
    const cut = (v, n) => String(v ?? "").slice(0, n);
    const city = cut(b.city, 60).trim();
    if (!city) return new Response("City required", { status: 400 });
    const origin = cut(b.origin, 60), from = cut(b.from, 10), to = cut(b.to, 10);
    const tier = ["budget", "mid", "comfort"].includes(b.tier) ? b.tier : "mid";
    const interest = cut(b.interest, 30);

    const prompt = `You are a travel guide writer. Make a trip guide for "${city}".
Dates: ${from} to ${to}. Travelling from: ${origin || "not given"}. Budget tier: ${tier}. Main interest: ${interest || "general"}.
If "${city}" is not a real place, return {"error":"unknown place"}.
Return ONLY JSON in exactly this shape:
{"n":"City name","e":"one emoji","sum":"2 sentences about the place","best":"best months to visit",
"pl":[["Place name","one-line description","heritage|nature|food|shopping|fun","emoji"]],
"fd":[["Dish or restaurant","one-line description","food","emoji"]],
"st":[["Stay type or area","approx price per night in INR","emoji"]],
"tr":"how to get there from the origin and get around locally",
"perDay":approx total cost per person per day in INR for the ${tier} tier}
Give 6 places, 6 foods, 3 stays that fit the ${tier} budget. Put the main interest first. Prices are estimates.`;

    const r = await ask(prompt, 0.6);
    if (!r.ok) return new Response("AI error " + r.status, { status: 502 });
    const data = await r.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    text = text.replace(/```json|```/g, "").trim();
    const guide = JSON.parse(text);
    if (guide.error) return new Response("Unknown place", { status: 404 });
    return new Response(JSON.stringify(guide), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response("Function error: " + e.message, { status: 500 });
  }
};
