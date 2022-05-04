import { loadScript } from "vue-plugin-load-script";

interface PyProxy {
    destroy(destroyed_msg?: string): any;
    get(key: any): any;
    set(key: any, value: any): any;
    length: number;
}

interface Pyodide {
    loadPackage(names: string | string[] | PyProxy,
        messageCallback?: (...args: any[]) => any,
        errorCallback?: (...args: any[]) => any): Promise<any>;
    runPython(code: string, globals?: PyProxy): any;
    runPythonAsync(code: string, globals?: PyProxy): Promise<any>;
    globals: PyProxy;
}

declare global {
    interface Window {
        loadPyodide(config?: { indexURL: string }): Promise<Pyodide>;
    }
}

let pyodide: Pyodide | undefined = undefined;

async function LoadPyodide(this: any, callback: (s: string) => void): Promise<Pyodide | undefined> {
    await loadScript("https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js");
    pyodide = await window.loadPyodide() as Pyodide;
    callback?.call(this, "Pyodide loaded. Installing micropip...");
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync("import micropip");
    callback?.call(this, "Micropip installed.");
    return pyodide;
}

function GetPyodide(): Pyodide {
    if (pyodide === undefined) {
        throw new Error("Pyodide not loaded");
    }
    return pyodide;
}

export { 
    type Pyodide, type PyProxy,
    LoadPyodide, GetPyodide
};