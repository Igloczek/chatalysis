<template>
  <div class="profile-manager">
    <h3>Profile Pictures</h3>

    <div class="profiles-grid">
      <div
        v-for="participant in participants"
        :key="participant"
        class="profile-item"
      >
        <div class="profile-image">
          <img
            v-if="profilePictures[participant]"
            :src="profilePictures[participant]"
            :alt="participant"
            class="profile-picture"
          />
          <div v-else class="profile-placeholder">
            {{ getInitials(participant) }}
          </div>
        </div>

        <div class="profile-name">{{ participant }}</div>

        <label class="upload-button">
          Upload Picture
          <input
            type="file"
            accept="image/*"
            @change="(e) => handleUpload(e, participant)"
            hidden
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  participants: string[];
}>();

const profilePictures = ref<Record<string, string>>({});

async function handleUpload(event: Event, username: string) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append("picture", file);
  formData.append("username", username);

  try {
    const response = await fetch("/api/upload-profile", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      // Update the profile picture in the UI
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          profilePictures.value[username] = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  } catch (error) {
    console.error("Profile picture upload failed:", error);
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

onMounted(async () => {
  // Load existing profile pictures
  for (const participant of props.participants) {
    try {
      const response = await fetch(`/api/profile/${participant}`);
      if (response.ok) {
        const blob = await response.blob();
        profilePictures.value[participant] = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error(
        `Failed to load profile picture for ${participant}:`,
        error
      );
    }
  }
});
</script>

<style scoped>
.profile-manager {
  padding: 20px;
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.profile-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.profile-picture {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-placeholder {
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: #666;
}

.profile-name {
  font-weight: bold;
}

.upload-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-button:hover {
  background-color: #0056b3;
}
</style>
