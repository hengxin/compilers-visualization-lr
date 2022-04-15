import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";
import pinia from "./stores";

createApp(App).use(router).use(pinia).use(i18n).mount("#app");
