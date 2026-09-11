import { put, list } from "@vercel/blob";
import crypto from "crypto";

const BLOB_NAME = "quote.json";

function createToken() {
    return crypto
        .createHmac("sha256", process.env.ADMIN_PASSWORD)
        .update("quote-admin")
        .digest("hex");
}

function isLoggedIn(request) {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(/(?:^|;\s*)quote_admin=([^;]+)/);

    if (!match) return false;

    const token = match[1];
    const expected = createToken();

    if (token.length !== expected.length) return false;

    return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expected)
    );
}

async function getQuote() {
    const result = await list({
        prefix: BLOB_NAME,
        limit: 1
    });

    if (!result.blobs.length) {
        return "Testing";
    }

    const response = await fetch(result.blobs[0].url);
    const data = await response.json();

    return data.quote || "Testing";
}

export async function GET() {
    return Response.json({
        quote: await getQuote()
    });
}

export async function POST(request) {
    try {
        const { password } = await request.json();

        if (password !== process.env.ADMIN_PASSWORD) {
            return Response.json(
                { error: "Incorrect password" },
                { status: 401 }
            );
        }

        const token = createToken();

        return new Response(
            JSON.stringify({ success: true }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",

                    "Set-Cookie":
                        `quote_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
                }
            }
        );

    } catch (error) {
        return Response.json(
            { error: "Login failed" },
            { status: 400 }
        );
    }
}

export async function PUT(request) {

    if (!isLoggedIn(request)) {
        return Response.json(
            { error: "Not logged in" },
            { status: 401 }
        );
    }

    try {
        const { quote } = await request.json();

        if (!quote || typeof quote !== "string") {
            return Response.json(
                { error: "Invalid quote" },
                { status: 400 }
            );
        }

        await put(
            BLOB_NAME,
            JSON.stringify({
                quote: quote.trim()
            }),
            {
                access: "public",
                addRandomSuffix: false,
                allowOverwrite: true
            }
        );

        return Response.json({
            success: true,
            quote: quote.trim()
        });

    } catch (error) {
        console.error(error);

        return Response.json(
            { error: "Could not save quote" },
            { status: 500 }
        );
    }
}
