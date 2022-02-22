<template>
    <img alt="Vue logo" src="./assets/logo.png" />
    <div v-show="pyodideLoaded">PYODIDE!</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadScript } from "vue-plugin-load-script";
const pyodideLoaded = ref(false);
async function initPyodide() {
    if (!window.__pyodide_module) {
        await loadScript("https://cdn.jsdelivr.net/pyodide/v0.19.0/full/pyodide.js")
        let pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.19.0/full/"
        });
        await pyodide.loadPackage("micropip");
    }
    pyodideLoaded.value = true;
}
onMounted(async () => {
    try {
        await initPyodide();
    } catch (error) {
        console.log(error)
    }
})

</script>

<style>
</style>
