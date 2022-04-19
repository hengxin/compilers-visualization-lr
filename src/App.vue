<template>
    <header class="header">VISUAL COMPILER</header>
    <main class="content">
        <router-view></router-view>
    </main>
    <footer class="footer">VISUAL COMPILER</footer>
</template>

<script setup lang="ts">
import { onErrorCaptured } from "vue";
import { useI18n } from "vue-i18n";
import { GNotification } from "@/components/index"

const { t } = useI18n({ useScope: "global" });

onErrorCaptured((err, instance, info) => {
    GNotification({
        title: err.name,
        content: err.message,
        type: "error",
    });
    // return值表示是否还要将错误传递给上层组件
    return false;
});

</script>
<style scoped>
.header {
    width: 100%;
    height: 48px;
    background-color: #001529;
    padding: 0 32px;
    color: aliceblue;
}
.content {
    min-height: calc(100vh - 80px);
    width: 100%;
    padding: 32px;
}
.footer {
    height: 32px;
}
</style>
<style>
:root {
    --color-klein-blue: #002FA7;
    --color-white: white;
    --color-gainsboro: gainsboro;
    --color-error: rgb(219, 90, 107); /* 海棠红 */
    --color-error-light: rgba(219, 90, 107, 0.2);
    --color-success: rgb(33, 166, 117); /* 松柏绿 */
    --color-success-light: rgb(33, 166, 117, 0.2);
    --color-info: rgb(89, 118, 186); /* 苍苍 */
    --color-info-light: rgb(89, 118, 186, 0.2);
    --color-warning: rgb(202, 105, 36); /* 琥珀 */
    --color-warning-light: rgba(202, 105, 36, 0.2);
    --color-primary: rgb(0, 47, 167); /* 克莱因蓝 */
    --color-primary-light: rgb(0, 47, 167, 0.2);
}
html {
    box-sizing: border-box;
}
*, *::before, *::after {
    box-sizing: inherit;
}
body {
    margin: 0;
}
a {
    text-decoration: none;
}
</style>
