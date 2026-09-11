import { put, list } from "@vercel/blob";
import crypto from "crypto";

const BLOB_NAME = "quote.json";

function makeToken() {
    return crypto
        .createHmac("sha256", process.env.ADMIN_PASSWORD)
        .update("quote-admin")
        .digest("hex");
}

function validToken(request) {
    const cookies = request.headers.get("cookie") || "";

    const match = cookies.match(/quote_admin=([^;]+)/);

    if (!match) return false;

    const expected = makeToken();

    return crypto.timingSafeEqual(
        Buffer.from(match[1]),
        Buffer.from(expected)
    );
}

async function getStoredQuote() {
    const result = await list({
        prefix: BLOB_NAME,
        limit: 1
    });

    if (!result.blobs.length) {
        return "Testing";
    }

    const blob = result.blobs[0];

    const response = await fetch(blob.url);
    const data = await response.json();

    return data.quote || "Testing";
}

export async function GET() {
    const quote = await getStoredQuote();

    return Response.json({
        quote
    });
}

export async function POST(request) {
    try {
        const body = await request.json();

        if (body.password !== process.env.ADMIN_PASSWORD) {
            return Response.json(
                { error: "Incorrect password" },
                { status: 401 }
            );
        }

        const token = makeToken();

        return new Response(
            JSON.stringify({ success: true }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Set-Cookie":
                        `quote_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
                }
            }
        );
    } catch {
        return Response.json(
            { error: "Login failed" },
            { status: 400 }
        );
    }
}

export async function PUT(request) {
    if (!validToken(request)) {
        return Response.json(
            { error: "Not authorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        if (typeof body.quote !== "string") {
            return Response.json(
                { error: "Invalid quote" },
                { status: 400 }
            );
        }

        const quote = body.quote.trim();

        if (!quote) {
            return Response.json(
                { error: "Quote cannot be empty" },
                { status: 400 }
            );
        }

        await put(
            BLOB_NAME,
            JSON.stringify({ quote }),
            {
                access: "public",
                addRandomSuffix: false,
                allowOverwrite: true
            }
        );

        return Response.json({
            success: true,
            quote
        });

    } catch (error) {
        console.error(error);

        return Response.json(
            { error: "Failed to save quote" },
            { status: 500 }
        );
    }
}
