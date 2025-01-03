import type { APIRoute } from "astro";
import { getAnalysis } from "@/server/services/storage";

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "No ID provided" }), {
      status: 400,
    });
  }

  const analysis = getAnalysis(id);
  if (!analysis) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify(analysis), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
