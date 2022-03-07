declare class PyProxy {
    destroy(destroyed_msg?: string);
    get(key: any): any;
    set(key: any, value: any);
    length: number;
}
declare interface Pyodide {
    async loadPackage(names: string | string[] | PyProxy,
        messageCallback?: (...args: any[]) => any,
        errorCallback?: (...args: any[]) => any);
    runPython(code: string, globals?: PyProxy);
    async runPythonAsync(code: string, globals?: PyProxy);
    globals: PyProxy;
}

export { PyProxy, Pyodide }