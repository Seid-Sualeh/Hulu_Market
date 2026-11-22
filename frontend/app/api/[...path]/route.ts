import { NextRequest, NextResponse } from "next/server";

const rawBackendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://hulu-market-backend.onrender.com"
    : "http://localhost:4001");

const BACKEND_URL = rawBackendUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const path = resolvedParams?.path || [];
  const pathString = Array.isArray(path) ? path.join("/") : "";
  const search = req.nextUrl.search || "";
  const targetUrl = `${BACKEND_URL}/api/${pathString}${search}`;

  // Strip hop-by-hop and host headers to prevent proxy rejection in undici / Node fetch
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "connection" &&
      lower !== "content-length" &&
      lower !== "transfer-encoding"
    ) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data") && req.body) {
        body = req.body as unknown as BodyInit;
      } else {
        body = await req.blob();
      }
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      cache: "no-store",
    };

    if (body) {
      fetchOptions.body = body;
      // @ts-expect-error duplex is required by Fetch standard when body is a ReadableStream
      fetchOptions.duplex = "half";
    }

    const response = await fetch(targetUrl, fetchOptions);

    const data = await response.blob();
    const responseHeaders = new Headers();
    response.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== "content-length" &&
        lower !== "transfer-encoding" &&
        lower !== "content-encoding"
      ) {
        responseHeaders.set(key, val);
      }
    });

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: `Could not connect to backend server at ${BACKEND_URL}. (${error.message})`,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
