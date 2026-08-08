<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const previousTitle = document.title;
const content = ref("");
const error = ref("");
let designStyle: HTMLStyleElement | null = null;

async function loadDesign() {
  try {
    const response = await fetch("/ai-design.html");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const documentSource = await response.text();
    const designDocument = new DOMParser().parseFromString(documentSource, "text/html");
    designDocument.querySelectorAll("script").forEach((script) => script.remove());

    designStyle = document.createElement("style");
    designStyle.dataset.starbudAiDesign = "true";
    designStyle.textContent = Array.from(designDocument.querySelectorAll("head style"))
      .map((style) => style.textContent || "")
      .join("\n");
    document.head.appendChild(designStyle);

    content.value = designDocument.body.innerHTML;
  } catch {
    error.value = "设计文档加载失败，请刷新页面重试。";
  }
}

function handleDesignClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const tab = target.closest<HTMLButtonElement>(".design-tab");
  if (!tab) return;

  const root = target.closest(".ai-design-view");
  root?.querySelectorAll(".design-tab").forEach((item) => item.setAttribute("aria-selected", "false"));
  root?.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("is-active"));
  tab.setAttribute("aria-selected", "true");
  if (tab.dataset.panel) root?.querySelector(`#${tab.dataset.panel}`)?.classList.add("is-active");
}

onMounted(() => {
  document.title = "星星芽 AI 助手产品与系统设计";
  loadDesign();
});

onBeforeUnmount(() => {
  designStyle?.remove();
  document.title = previousTitle;
});
</script>

<template>
  <div class="ai-design-view" @click="handleDesignClick">
    <div v-if="content" v-html="content"></div>
    <main v-else class="ai-design-state" aria-live="polite">
      {{ error || "正在加载设计文档…" }}
    </main>
  </div>
</template>

<style scoped>
.ai-design-view {
  min-height: 100vh;
  width: 100%;
  background: #f4f7f5;
}

.ai-design-state {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  place-items: center;
  color: #66776f;
  font-size: 15px;
}
</style>
