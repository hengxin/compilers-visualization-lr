import { loadScript } from "vue-plugin-load-script";
import { Pyodide } from "./pyodide";
let pyodide: Pyodide | undefined = undefined;
export default async function loadLark(callback: (s: string) => void): Promise<Pyodide> {
    console.log(pyodide);
    if (pyodide === undefined) {
        try {
            callback("Loading Pyodide...");
            await loadScript("https://cdn.jsdelivr.net/pyodide/v0.19.0/full/pyodide.js")
            // @ts-ignore
            pyodide = await window.loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.19.0/full/"
            }) as Pyodide;
            callback("Pyodide loaded. Installing micropip...");
            await pyodide.loadPackage("micropip");
            callback("Micropip installed. Installing Lark...");
            await pyodide.runPythonAsync("import micropip; await micropip.install('lark')");
            await pyodide.runPythonAsync("from lark import Lark");
            await pyodide.runPythonAsync("import json")
            callback("Finish loading Lark.");
        } catch (e) {
            // TODO 
            console.log(e);
        }
    }
    return pyodide!;

}