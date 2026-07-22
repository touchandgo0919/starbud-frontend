<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { HomeFilled, List, Setting } from "@element-plus/icons-vue";

const route = useRoute();
const pageTitle = computed(() => String(route.meta.title || "任务管理"));
</script>

<template>
  <el-container class="admin-layout">
    <el-aside width="210px" class="admin-sidebar">
      <div class="brand">Starbud</div>
      <el-menu router :default-active="route.path" class="admin-menu">
        <el-menu-item index="/tasks">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><List /></el-icon>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item disabled index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>首页</el-breadcrumb-item>
          <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
      </el-header>

      <div class="admin-tags">
        <router-link to="/tasks" class="admin-tag">首页</router-link>
        <router-link to="/tasks" class="admin-tag admin-tag--active">{{ pageTitle }}</router-link>
      </div>

      <el-main class="admin-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #17191d;
}

.admin-sidebar {
  min-height: 100vh;
  background: #1d1f23;
  border-right: 1px solid #303238;
}

.brand {
  display: flex;
  align-items: center;
  height: 62px;
  padding: 0 28px;
  color: #00b96b;
  font-size: 20px;
  font-weight: 700;
}

.admin-menu {
  border-right: 0;
  --el-menu-bg-color: #1d1f23;
  --el-menu-hover-bg-color: #292c31;
  --el-menu-text-color: #d6d8dc;
  --el-menu-active-color: #00b96b;
}

.admin-header {
  display: flex;
  align-items: center;
  height: 62px;
  border-bottom: 1px solid #303238;
  background: #17191d;
}

.admin-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-bottom: 1px solid #303238;
  background: #17191d;
}

.admin-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  color: #d6d8dc;
  font-size: 12px;
  text-decoration: none;
  border: 1px solid #42454b;
}

.admin-tag--active {
  color: #fff;
  border-color: #00b96b;
  background: #00a85f;
}

.admin-main {
  min-height: calc(100vh - 96px);
  padding: 20px;
  background: #17191d;
}

@media (max-width: 760px) {
  .admin-sidebar {
    width: 64px !important;
  }

  .brand {
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .brand::before {
    content: "S";
    font-size: 20px;
  }

  .admin-menu :deep(.el-menu-item) {
    justify-content: center;
    padding: 0 !important;
  }

  .admin-menu :deep(.el-menu-item span) {
    display: none;
  }

  .admin-main {
    padding: 14px;
  }
}
</style>
