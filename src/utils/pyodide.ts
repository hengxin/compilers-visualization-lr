import { loadScript } from "vue-plugin-load-script";
import { CommonError } from "@/utils/exception";

interface PyProxy {
    destroy(destroyed_msg?: string): any;
    get(key: any): any;
    set(key: any, value: any): any;
    length: number;
}

interface PyodideInterface {
    loadPackage(names: string | string[] | PyProxy,
        messageCallback?: (msg: string) => void,
        errorCallback?: (msg: string) => void): Promise<void>;
    runPython(code: string, options?: { globals?: PyProxy; }): any;
    runPythonAsync(code: string, options?: { globals?: PyProxy; }): Promise<any>;
    globals: PyProxy;
}

declare global {
    interface Window {
        loadPyodide(config?: { indexURL: string }): Promise<PyodideInterface>;
    }
}

let pyodide: PyodideInterface | undefined = undefined;

async function LoadPyodide(this: any, callback: (s: string) => void): Promise<PyodideInterface | undefined> {
    await loadScript("https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js");
    pyodide = await window.loadPyodide() as PyodideInterface;
    // await loadScript("/pyodide/pyodide.js");
    // pyodide = await window.loadPyodide({ indexURL: "/pyodide" }) as PyodideInterface;
    callback?.call(this, "Pyodide loaded. Installing micropip...");
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync("import micropip");
    callback?.call(this, "Micropip installed.");
    return pyodide;
}

function GetPyodide(): PyodideInterface {
    if (pyodide === undefined) {
        throw new CommonError("PyodideNotLoaded");
    }
    return pyodide;
}

export {
    type PyodideInterface, type PyProxy,
    LoadPyodide, GetPyodide
};