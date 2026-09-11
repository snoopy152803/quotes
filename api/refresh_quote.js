import { put } from "@vercel/blob";

const FILE = "quote.json";

// Fetches a random quote from ZenQuotes (free, no API key required)
async function fetchRandomQuote() {
    const response = await fetch("https://zenquotes.io/api/random");

    if (!response.ok) {
        throw new Error("Quote API request failed");
    }

    const data = await response.json();

    // ZenQuotes returns: [{ q: "quote text", a: "author", ... }]
    const entry = data[0];

    if (!entry || !entry.q) {
        throw new Error("Unexpected quote API response");
    }

    const quote = entry.a
        ? `${entry.q} — ${entry.a}`
        : entry.q;

    return quote;
}

// This is called by Vercel Cron once a day.
// GET is used because Vercel Cron only sends GET requests.
export async function GET(request) {
    // Protect this endpoint so randoms on the internet can't trigger it.
    // Vercel Cron automatically sends this header on its requests.
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const quote = await fetchRandomQuote();

        await put(
            FILE,
            JSON.stringify({ quote }),
            {
                access: "private",
                addRandomSuffix: false,
                allowOverwrite: true,
                contentType: "application/json"
            }
        );

        return Response.json({ success: true, quote });

    } catch (error) {
        return Response.json(
            { error: "Failed to refresh quote", details: error.message },
            { status: 500 }
        );
    }
}
