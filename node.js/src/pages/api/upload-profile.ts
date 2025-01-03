import type { APIRoute } from "astro";
import { StorageService } from "../../server/services/StorageService";

const storage = new StorageService();

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("picture") as File;
    const username = formData.get("username") as string;

    if (!file || !username) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
        }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = await storage.saveProfilePicture(buffer, username);

    return new Response(JSON.stringify({ fileName }), {
      status: 200,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
    });
  }
};
