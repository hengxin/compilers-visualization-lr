import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";
import store from "./store";

createApp(App).use(router).use(store).use(i18n).mount('#app')
