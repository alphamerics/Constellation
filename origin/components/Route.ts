import { Method } from "../Constellation";

interface IRoute {
    method: Method;
    path: string;
    callback: Function;
}

export default class Route implements IRoute {
    method: Method;
    path: string;
    callback: Function;
    parameters: string[] = [];

    constructor(method: Method, path: string, callback: Function) {
        this.method = method;
        this.path = path;
        this.callback = callback;

        this.parameters = this.fetchParameters(path);
    }

    /**
     * 
     * @param path 
     * @returns 
     * @deprecated
     */
    private fetchParameters(path: string): string[] {
        const segments: string[] = path.split('/');
        const collection: string[] = [];

        for (const segment of segments) {
            if (segment.startsWith(":")) collection.push(segment.substring(1, segment.length));
        }

        return collection;
    }
}

