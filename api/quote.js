import { put, get } from "@vercel/blob";
import crypto from "crypto";

const FILE = "quote.json";

function token() {
    return crypto
        .createHmac("sha256", process.env.ADMIN_PASSWORD)
        .update("afewquotes-admin")
        .digest("hex");
}

function authenticated(request) {
    const cookie = request.headers.get("cookie") || "";

    const match = cookie
        .split(";")
        .map(x => x.trim())
        .find(x => x.startsWith("quote_admin="));

    if (!match) return false;

    const supplied = decodeURIComponent(
        match.substring("quote_admin=".length)
    );

    const expected = token();

    return supplied === expected;
}

async function readQuote() {
    try {
        const result = await get(FILE, {
            access: "private",
            useCache: false
        });

        if (!result) return "Testing";

        const text = await new Response(result.stream).text();
        const data = JSON.parse(text);

        return data.quote || "Testing";
    } catch {
        return "Testing";
    }
}

export async function GET() {
    const quote = await readQuote();

    return Response.json({ quote });
}

export async function POST(request) {
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
        return Response.json(
            { error: "Incorrect password" },
            { status: 401 }
        );
    }

    return new Response(
        JSON.stringify({ success: true }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie":
                    `quote_admin=${encodeURIComponent(token())}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
            }
        }
    );
}

export async function PUT(request) {
    if (!authenticated(request)) {
        return Response.json(
            { error: "Not logged in" },
            { status: 401 }
        );
    }

    const { quote } = await request.json();

    if (!quote || typeof quote !== "string") {
        return Response.json(
            { error: "Invalid quote" },
            { status: 400 }
        );
    }

    await put(
        FILE,
        JSON.stringify({
            quote: quote.trim()
        }),
        {
            access: "private",
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: "application/json"
        }
    );

    return Response.json({
        success: true,
        quote: quote.trim()
    });
}
