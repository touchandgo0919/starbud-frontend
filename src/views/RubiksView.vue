<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  window.location.replace("/rubiks/index.html");
});
</script>

<template>
  <main class="rubiks-redirect" aria-live="polite">
    正在打开二阶魔方公式页…
  </main>
</template>

<style scoped>
.rubiks-redirect {
  display: grid;
  min-height: 100vh;
  place-items: center;
  color: #5f6e68;
  background: #f2f1ed;
  font-size: 15px;
}
</style>
