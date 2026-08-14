import { createApp } from "vue";
import "element-plus/theme-chalk/dark/css-vars.css";
import "virtual:uno.css";
import App from "./App.vue";
import router from "./router";
import pinia from "./store";
import "./styles.css";

document.documentElement.classList.add("dark");

createApp(App).use(pinia).use(router).mount("#app");
