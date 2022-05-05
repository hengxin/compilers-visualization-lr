<template>
    <header class="header">
        <span>{{t('ProjectName')}}(LR)</span>
    </header>
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
    font-family: "Cascadia Mono", "Courier New", Courier, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace;
    font-size: 20px;
    font-weight: bold;
}
.content {
    overflow: auto;
    height: calc(100vh - 64px);
    width: 100%;
    padding: 16px;
    position: relative;
}
.footer {
    height: 16px;
    font-size: 12px;
    line-height: 12px;
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
    font-size: 12px;
}
*, *::before, *::after {
    box-sizing: inherit;
}
body {
    margin: 0;
    font-family: Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
a {
    text-decoration: none;
}

*::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

*::-webkit-scrollbar-thumb {
    background-color: gainsboro;
    border-radius: 6px;
}

*::-webkit-scrollbar-track {
    background-color: #f1f1f1;
}

*::-webkit-scrollbar-corner {
    background-color: #dcdcdc;
}

*::-webkit-scrollbar-button {
    background-color: #f1f1f1;
    height: 2px;
    width: 2px;
}

@font-face {
    font-family: "KaTex_Math";
    src: url("/fonts/KaTeX_Math-Italic.woff2") format("woff2");
    font-weight: normal;
}

@font-face {
    font-family: "KaTex_Math";
    src: url("/fonts/KaTeX_Math-BoldItalic.woff2") format("woff2");
    font-weight: bold;
}

@font-face {
    font-family: "KaTex_Main";
    src: url("/fonts/KaTeX_Main-Regular.woff2") format("woff2");
}

@font-face {
    font-family: "KaTex_Main";
    src: url("/fonts/KaTeX_Main-Italic.woff2") format("woff2");
    font-style: italic;
}

@font-face {
    font-family: "KaTex_Main";
    src: url("/fonts/KaTeX_Main-Bold.woff2") format("woff2");
    font-weight: bold;
}

@font-face {
    font-family: "KaTex_Main";
    src: url("/fonts/KaTeX_Main-BoldItalic.woff2") format("woff2");
    font-weight: bold;
    font-style: italic;
}
</style>
