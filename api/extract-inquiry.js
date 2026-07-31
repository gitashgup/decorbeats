const INQUIRY_SYSTEM_PROMPT = `You are a data extraction assistant for Decorbeats, an Indian brass, gifting and decor business. Extract structured information from the sales inquiry transcript. Return only a valid JSON object.

Use this shape:
{
  "customer_name": string or null,
  "customer_phone": string or null,
  "source": "phone" | "whatsapp" | "walkin",
  "occasion": string or null,
  "required_by_date": string or null,
  "budget_per_unit": number or null,
  "total_budget": number or null,
  "notes": string or null,
  "products": [
    {
      "product_name": string,
      "quantity_requested": number or null,
      "quoted_price": number or null
    }
  ]
}`;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function verifyAdminToken(request) {
  const authorization = String(request.headers.authorization || "");
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  return userResponse.ok;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    if (!(await verifyAdminToken(request))) {
      sendJson(response, 401, { error: "Admin authentication required" });
      return;
    }

    const body = await readJsonBody(request);
    const transcript = String(body.transcript || "").trim().slice(0, 12000);
    if (!transcript) {
      sendJson(response, 400, { error: "Transcript is required" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI service is not configured");
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INQUIRY_SYSTEM_PROMPT },
          { role: "user", content: transcript }
        ]
      })
    });

    const payload = await openAIResponse.json().catch(() => null);
    if (!openAIResponse.ok) {
      throw new Error(payload?.error?.message || "Could not process the inquiry");
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("The inquiry service returned an empty response");
    }

    sendJson(response, 200, { inquiry: JSON.parse(content) });
  } catch (error) {
    console.error("Inquiry extraction error:", error);
    sendJson(response, 500, { error: error.message || "Could not process the inquiry" });
  }
}
