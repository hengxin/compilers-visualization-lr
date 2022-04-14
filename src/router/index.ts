import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
    { path: "/", redirect: "/lr" },
    {
        path: "/lr",
        name: "lr",
        component: () => import("@/views/lr/index.vue"),
        props: route => ({ algo: route.query.a }),
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;