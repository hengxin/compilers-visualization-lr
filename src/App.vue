<template>
    <header class="header">VISUAL COMPILER</header>
    <main class="content">
        <router-view></router-view>
    </main>
    <footer class="footer">VISUAL COMPILER</footer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({});

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
    height: calc(100vh - 80px);
    width: 100%;
    padding: 32px;
}
.footer {
    height: 32px;
}
</style>
<style>
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
