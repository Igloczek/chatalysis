import type { APIRoute } from "astro";
import { saveFile } from "@/server/services/storage";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await saveFile(buffer);

    return new Response(JSON.stringify({ path }), { status: 200 });
  } catch (error) {
    console.error("File upload error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Upload failed",
      }),
      { status: 500 }
    );
  }
};
