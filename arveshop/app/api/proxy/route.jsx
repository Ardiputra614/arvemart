import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  return handleRequest(request, params, "GET");
}

export async function POST(request, { params }) {
  return handleRequest(request, params, "POST");
}

export async function PUT(request, { params }) {
  return handleRequest(request, params, "PUT");
}

export async function PATCH(request, { params }) {
  return handleRequest(request, params, "PATCH");
}

export async function DELETE(request, { params }) {
  return handleRequest(request, params, "DELETE");
}

async function handleRequest(request, params, method) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const API_SECRET_KEY = process.env.API_SECRET_KEY;

    const path = params.path.join("/");
    const url = new URL(request.url);
    const targetUrl = `${API_URL}/api/admin/${path}${url.search}`;

    const headers = { "X-API-Key": API_SECRET_KEY };
    let body;

    if (method !== "GET") {
      if (
        request.headers.get("content-type")?.includes("multipart/form-data")
      ) {
        body = await request.formData();
      } else {
        const json = await request.json();
        body = JSON.stringify(json);
        headers["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(targetUrl, { method, headers, body });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
