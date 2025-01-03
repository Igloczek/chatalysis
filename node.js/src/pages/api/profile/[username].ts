import type { APIRoute } from "astro";
import { StorageService } from "../../../server/services/StorageService";

const storage = new StorageService();

export const GET: APIRoute = async ({ params }) => {
  try {
    const { username } = params;
    if (!username) {
      return new Response("Username is required", { status: 400 });
    }

    const picture = await storage.getProfilePicture(username);
    if (!picture) {
      return new Response("Profile picture not found", { status: 404 });
    }

    return new Response(picture, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Profile picture fetch error:", error);
    return new Response("Failed to fetch profile picture", { status: 500 });
  }
};
