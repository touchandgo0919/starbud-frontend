<script setup lang="ts">
import { computed, ref } from "vue";
import { Mute, MuteNotification, VideoPause, VideoPlay } from "@element-plus/icons-vue";

const props = defineProps<{
  src: string;
  durationMs?: number | null;
}>();

const player = ref<HTMLAudioElement>();
const currentSeconds = ref(0);
const metadataSeconds = ref(0);
const playing = ref(false);
const muted = ref(false);

const totalSeconds = computed(() => {
  const supplied = Math.max(0, Math.round((props.durationMs || 0) / 1000));
  return supplied || Math.max(0, Math.round(metadataSeconds.value));
});

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function togglePlayback() {
  const audio = player.value;
  if (!audio) return;
  if (audio.paused) {
    void audio.play();
  } else {
    audio.pause();
  }
}

function seek(event: Event) {
  const audio = player.value;
  if (!audio) return;
  const value = Number((event.target as HTMLInputElement).value);
  audio.currentTime = value;
  currentSeconds.value = value;
}

function toggleMute() {
  const audio = player.value;
  if (!audio) return;
  audio.muted = !audio.muted;
  muted.value = audio.muted;
}

function syncMetadata() {
  metadataSeconds.value = Number.isFinite(player.value?.duration) ? player.value!.duration : 0;
}
</script>

<template>
  <div class="submission-audio-player">
    <audio
      ref="player"
      preload="metadata"
      :src="src"
      @loadedmetadata="syncMetadata"
      @timeupdate="currentSeconds = player?.currentTime || 0"
      @play="playing = true"
      @pause="playing = false"
      @ended="currentSeconds = 0"
    >当前浏览器不支持播放录音。</audio>
    <button type="button" class="audio-control-button" :aria-label="playing ? '暂停录音' : '播放录音'" @click="togglePlayback">
      <el-icon><VideoPause v-if="playing" /><VideoPlay v-else /></el-icon>
    </button>
    <span class="audio-time">{{ playing ? formatTime(currentSeconds) : formatTime(totalSeconds) }}</span>
    <input
      class="audio-progress"
      type="range"
      min="0"
      :max="Math.max(totalSeconds, 1)"
      :value="Math.min(currentSeconds, totalSeconds)"
      aria-label="录音播放进度"
      @input="seek"
    />
    <button type="button" class="audio-control-button" :aria-label="muted ? '打开声音' : '静音'" @click="toggleMute">
      <el-icon><Mute v-if="muted" /><MuteNotification v-else /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.submission-audio-player {
  display: flex;
  align-items: center;
  width: 170px;
  height: 32px;
  padding: 0 10px;
  gap: 8px;
  border-radius: 18px;
  background: #414141;
  color: #f5f5f5;
  box-sizing: border-box;
}

.submission-audio-player audio { display: none; }
.audio-control-button { display: grid; flex: 0 0 auto; width: 18px; height: 18px; padding: 0; place-items: center; border: 0; background: transparent; color: inherit; cursor: pointer; }
.audio-control-button .el-icon { font-size: 16px; }
.audio-time { flex: 0 0 auto; font-size: 14px; font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap; }
.audio-progress { width: 100%; min-width: 24px; height: 3px; margin: 0; accent-color: #c8c8c8; cursor: pointer; }
</style>
