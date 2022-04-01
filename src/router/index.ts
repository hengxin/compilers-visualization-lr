import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
    { path: "/", redirect: "/lr" },
    {
        path: "/lr",
        name: "lr",
        component: () => import("@/views/lr/index.vue"),
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;