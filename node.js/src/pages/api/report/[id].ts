import type { APIRoute } from "astro";
import StorageService from "../../../server/services/StorageService";

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "No ID provided" }), {
      status: 400,
    });
  }

  const analysis = StorageService.get(id);
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
