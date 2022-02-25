<template>
    <div>WTF</div>
    <img alt="Vue logo" src="./assets/logo.png" />
    <div v-show="pyodideLoaded">PYODIDE!</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
// // import { loadScript } from "vue-plugin-load-script";
import loader from "@/utils/pyodide-loader";
const pyodideLoaded = ref(false);
async function init() {
    let pyodide;
    try {
        pyodide = await loader();
        pyodide.runPython("import lark");
        let grammar = `start:e
e: e "+" t
| t
t: t "*" f
| f
f: "(" e ")"
| ID


ID: LETTER (LETTER|DIGIT)*
LETTER: "_" | "a".."z" | "A".."Z"
DIGIT: "0".."9"

%import common.WS
%ignore WS`;
/**
 * Make sure to destroy PyProxies when you are done with them to avoid memory leaks.

let foo = pyodide.globals.get('foo');
foo();
foo.destroy();
foo(); // throws Error: Object has already been destroyed
 */
        let options = {
            parser: "lalr",
            keep_all_tokens: true,
        }
        let create_parser = `parser = lark.Lark(grammar, parser="lalr", keep_all_tokens=True)`;
        pyodide.globals.set('grammar', grammar);
        let parser = await pyodide.runPythonAsync(create_parser);
        parser = await pyodide.runPythonAsync("parser");
        console.log(parser);
        // @ts-ignore
        window.parser = parser;
        pyodideLoaded.value = true;
    } catch (e) {
        console.log(e);
    }
}
init();
// async function initPyodide() {
//     if (!window.__pyodide_module) {
//         await loadScript("https://cdn.jsdelivr.net/pyodide/v0.19.0/full/pyodide.js")
//         let pyodide = await window.loadPyodide({
//             indexURL: "https://cdn.jsdelivr.net/pyodide/v0.19.0/full/"
//         });
//         await pyodide.loadPackage("micropip");
//     }
//     pyodideLoaded.value = true;
// }
// onMounted(async () => {
//     try {
//         // await initPyodide();
//     } catch (error) {
//         console.log(error)
//     }
// })

</script>

<style>
</style>
