import { loadScript } from "vue-plugin-load-script";
export default async function init() {
    // @ts-ignore
    if (!window.__pyodide_module) {
        await loadScript("https://cdn.jsdelivr.net/pyodide/v0.19.0/full/pyodide.js")
        // @ts-ignore
        let pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.19.0/full/"
        });
        console.log("Pyodide loaded");
        await pyodide.loadPackage("micropip");
        console.log("Installed micropip");
        await pyodide.runPythonAsync("import micropip; await micropip.install('lark')");
        console.log("Installed Lark");
        console.log(pyodide);
        return pyodide;
    }
}