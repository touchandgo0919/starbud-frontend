import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layout/AdminLayout.vue";
import TaskWorkspace from "../views/TaskWorkspace.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AdminLayout,
      redirect: "/tasks",
      children: [
        {
          path: "tasks",
          name: "Tasks",
          component: TaskWorkspace,
          meta: { title: "任务管理" }
        }
      ]
    }
  ]
});

export default router;
