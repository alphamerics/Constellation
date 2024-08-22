import Route from './Route';
import { Method } from "../Constellation";

type TFormation = {
    prefix?: string;
}

export default class Formation implements TFormation {
    private routes: Route[] = [];
    prefix?: string;

    constructor(criteria: { prefix?: string }) {
        this.prefix = criteria.prefix;
    }

    /**
     * Pushes a new GET route wtih specified parameters into this.routes
     * 
     * @param path 
     * @param callback 
     * @returns {this}
     */
    public get(path: string, callback: Function): this {
        this.routes.push(new Route(Method.GET, (this.prefix + path), callback));

        return this;
    }

    /**
     * Pushes a new POST route wtih specified parameters into this.routes
     * 
     * @param path 
     * @param callback 
     * @returns {this}
     */
    public post(path: string, callback: Function): this {
        this.routes.push(new Route(Method.POST, (this.prefix) + path, callback));

        return this;
    }

    /**
     * Pushes a new DELETE route with specified parameters into this.routes
     * 
     * @param path 
     * @param callback 
     * @returns {this}
     */
    public delete(path: string, callback: Function): this {
        this.routes.push(new Route(Method.DELETE, (this.prefix + path), callback));

        return this;
    }

    public getRoutes(): Route[] {
        return this.routes;
    }
}