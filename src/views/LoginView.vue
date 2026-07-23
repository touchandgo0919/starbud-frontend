<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Hide, View } from "@element-plus/icons-vue";
import { useAuthStore } from "../store/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const error = ref("");
const showPassword = ref(false);
const mode = ref<"login" | "register">("login");
const form = reactive({ username: "admin", password: "" });
const registerForm = reactive({ username: "", displayName: "", password: "" });

async function submit() {
  error.value = "";
  try {
    if (mode.value === "register") {
      await auth.register({
        username: registerForm.username.trim(),
        displayName: registerForm.displayName.trim(),
        password: registerForm.password
      });
    } else {
      await auth.signIn(form.username.trim(), form.password);
    }
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/home";
    await router.replace(redirect);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : mode.value === "register" ? "注册失败。" : "登录失败，请检查账号和密码。";
  }
}

function switchMode(nextMode: "login" | "register") {
  mode.value = nextMode;
  error.value = "";
  showPassword.value = false;
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-brand">
        <img class="brand-logo brand-logo--large" src="/starbud-icon.png" alt="星芽AI助手" />
        <span>星芽AI助手</span>
      </div>
      <div class="login-heading">
        <h1>{{ mode === "register" ? "创建家长账号" : "欢迎回来" }}</h1>
        <p>{{ mode === "register" ? "注册后可创建家庭和子女账号" : "登录家庭任务管理后台" }}</p>
      </div>

      <el-segmented
        :model-value="mode"
        :options="[
          { label: '登录', value: 'login' },
          { label: '注册', value: 'register' }
        ]"
        @update:model-value="(value: string | number | boolean) => switchMode(value as 'login' | 'register')"
      />

      <template v-if="mode === 'login'">
        <label class="field">
        <span>用户名</span>
        <el-input v-model="form.username" size="large" autocomplete="username" placeholder="请输入用户名" />
        </label>
        <label class="field">
        <span>密码</span>
        <el-input
          v-model="form.password"
          size="large"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="请输入密码"
        >
          <template #suffix>
            <button type="button" class="input-icon-button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
              <el-icon><Hide v-if="showPassword" /><View v-else /></el-icon>
            </button>
          </template>
        </el-input>
        </label>
      </template>

      <template v-else>
        <label class="field">
          <span>用户名</span>
          <el-input v-model="registerForm.username" size="large" autocomplete="username" placeholder="3-40 位字母、数字、点、横线或下划线" />
        </label>
        <label class="field">
          <span>家长姓名</span>
          <el-input v-model="registerForm.displayName" size="large" placeholder="例如：赵涛" />
        </label>
        <label class="field">
          <span>密码</span>
          <el-input
            v-model="registerForm.password"
            size="large"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="至少 6 个字符"
          >
            <template #suffix>
              <button type="button" class="input-icon-button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                <el-icon><Hide v-if="showPassword" /><View v-else /></el-icon>
              </button>
            </template>
          </el-input>
        </label>
      </template>

      <p v-if="error" class="form-error">{{ error }}</p>
      <el-button class="login-button" type="primary" size="large" native-type="submit" :loading="auth.loading">
        {{ mode === "register" ? "注册并登录" : "登录" }}
      </el-button>
      <p class="login-help">{{ mode === "register" ? "注册账号默认为家长权限" : "初始管理员：admin" }}</p>
    </form>
  </main>
</template>
