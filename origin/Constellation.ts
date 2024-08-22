import * as http from 'http';
import { parse as parseUrl, UrlWithParsedQuery } from 'url';
import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
import Route from './components/Route';
import Formation from "./components/Formation";
import { I } from "./components/Inference"

/**
 * Scans directory for TypeScript files and collects their paths.
 * 
 * @param directoryName 
 * @param folder 
 * @returns {Array<String>}
 */
function getFiles(directoryName: string, folder: string): string[] {
    const files: string[] = fs.readdirSync(directoryName + folder);
    let collection: string[] = [];

    files.forEach((file) => {
        const filePath = path.join(directoryName, `${folder}${file}`);
        const fileSuffix = file.split(".")[1];

        if (!fs.statSync(filePath).isDirectory() && fileSuffix == "ts") collection.push(filePath);
    })

    return collection;
}

export const enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS",
    CONNECT = "CONNECT",
    TRACE = "TRACE",
}

export class Constellation {
    static server: http.Server;
    static routes: Route[] = [];

    private directoryName: string;
    private routesPath: string;

    constructor(directoryName: string, routesPath: string) {
        this.directoryName = directoryName;
        this.routesPath = routesPath;

        this.initializeRoutes();

        Constellation.server = http.createServer(this.handleRequest.bind(this))
    }

    /**
     * Scans the initialized routes directory for exports to push into Constellation.routes
     * 
     * @returns {Promise<void>}
     * @throws {TypeErrorException} Thrown if a scanned directory doesn't export a Route or Formation instance.
     * 
     * @private
     * @async
     */
    private async initializeRoutes(): Promise<void> {
        const files = getFiles(this.directoryName, this.routesPath);
    
        for (const file of files) {
            const fileURL = pathToFileURL(path.resolve(file)).href;
            let data = await import(fileURL)
                .then((module) => module.default)
                .catch((err) => console.log(err));
            
            if (data instanceof Formation) {
                Constellation.routes.push(...data.getRoutes());
            } else if (data instanceof Route) {
                Constellation.routes.push(data);
            } else {
                throw new TypeError("Export must be a Route or Formation instance.");
            }
        }
    }

    /**
     * Sends an HTTP response and casts the inferred parameters to the route's callback.
     * Then the callback's return value is sent as the HTTP response body.
     * 
     * @param route 
     * @param parameters 
     * @param pathname 
     * @param response 
     * 
     * @private
     */
    private async handleGet(route: Route, parameters: Record<string, string>, pathname: string, response: http.ServerResponse<http.IncomingMessage>) {
        if (Object.keys(parameters).length > 0 || pathname === route.path) {
            try {
                const inferredParams = Object.values(parameters).map(param => I.infer(param));
                const getResult = await route.callback(...inferredParams);
                response.statusCode = 200;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify(getResult));
            } catch (error) {
                response.statusCode = 500; // Internal Server Error
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        }
    }

    /**
     * Sends an HTTP response and casts the inferred parameters to the route's callback.
     * Then the callback's return value is sent as the HTTP response body.
     * The sent body in the post request is accessible by the function.
     * 
     * @param route 
     * @param parameters 
     * @param pathname 
     * @param request 
     * @param response 
     * 
     * @private
     */
    private async handlePost(route: Route, parameters: Record<string, string>, pathname: string, request: http.IncomingMessage, response: http.ServerResponse<http.IncomingMessage>) {
        if (Object.keys(parameters).length > 0 || pathname === route.path) {
            let body = '';
            request.on('data', chunk => {
                body += chunk.toString(); // Collect the body data chunks
            });
    
            request.on('end', async () => {
                try {
                    const parsedBody = JSON.parse(body); // Parse the body as JSON
                    const combinedParams = { ...parameters, ...parsedBody }; // Combine route and body parameters
                    const postResult = await route.callback(combinedParams); // Pass combined params as a single object
    
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    response.end(JSON.stringify({ result: postResult, parameters: combinedParams }));
                } catch (error) {
                    response.statusCode = 400; // Bad Request
                    response.setHeader("Content-Type", "application/json");
                    response.end(JSON.stringify({ error: "Invalid JSON" }));
                }
            });
        }
    }

    /**
     * Sends an HTTP response and casts the inferred parameters to the route's callback.
     * Then the callback's return value is sent as the HTTP response body.
     * 
     * @param route 
     * @param parameters 
     * @param pathname 
     * @param response 
     * 
     * @private
     */
    private async handleDelete(route: Route, parameters: Record<string, string>, pathname: string, request: http.IncomingMessage, response: http.ServerResponse<http.IncomingMessage>) {
        if (Object.keys(parameters).length > 0 || pathname === route.path) {
            let body = '';
            request.on('data', chunk => {
                body += chunk.toString(); // Collect the body data chunks
            });
    
            request.on('end', async () => {
                try {
                    const parsedBody = body ? JSON.parse(body) : {}; // Parse the body as JSON if it exists
                    const combinedParams = { ...parameters, ...parsedBody }; // Combine route and body parameters
                    const deleteResult = await route.callback(combinedParams); // Pass combined params as a single object
    
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    response.end(JSON.stringify({ result: deleteResult, parameters: combinedParams }));
                } catch (error) {
                    response.statusCode = 400; // Bad Request
                    response.setHeader("Content-Type", "application/json");
                    response.end(JSON.stringify({ error: "Invalid JSON" }));
                }
            });
        } else {
            response.statusCode = 404; // Not Found
            response.end();
        }
    }
    

    /**
     * Traverses through initialized routes and handles the specified method.
     * 
     * @param request 
     * @param response 
     * @returns {Promise<void>}
     * 
     * @private
     * @async
     */
    private async handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const parsedUrl: UrlWithParsedQuery = parseUrl(request.url || '', true);
        const pathname: string = parsedUrl.pathname || '';
        let routeMatched = false;
    
        for (const route of Constellation.routes) {
            const parameters = this.fetchParameters(pathname, route.path) || {};
    
            if (request.method === 'GET' && route.method === Method.GET) {
                this.handleGet(route, parameters, pathname, response);
                routeMatched = true;
            }
    
            if (request.method === 'POST' && route.method === Method.POST) {
                this.handlePost(route, parameters, pathname, request, response);
                routeMatched = true;
            }
    
            if (request.method === 'DELETE' && route.method === Method.DELETE) {
                this.handleDelete(route, parameters, pathname, request, response);
                routeMatched = true;
            }
        }
    
        if (!routeMatched) {
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.end('Not Found');
        }
    }
    

    /**
     * Splices route path and stores dynamic parameters in a Record object.
     * 
     * @param pathname 
     * @param routePath 
     * @returns {Record<string, string> | null}
     * 
     * @private
     */
    private fetchParameters(pathname: string, routePath: string): Record<string, string> | null {
        const routeSegments = routePath.split('/');
        const urlSegments = pathname.split('/');

        if (routeSegments.length !== urlSegments.length) return null;

        const parameters: Record<string, string> = {};

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const urlSegment = urlSegments[i];

            if (routeSegment.startsWith(':')) {
                const parameterName = routeSegment.substring(1);
                parameters[parameterName] = urlSegment;
            } else if (routeSegment !== urlSegment) {
                return null;
            }
        }

        return parameters;
    }

    public static fetchDirname(moduleURL: string): string {
        const filename = fileURLToPath(moduleURL)
        return path.dirname(filename)
    }

    /**
     * Makes HTTP server listen on specified port
     * 
     * @param port 
     * @param hostname 
     * @param callback 
     * @returns {void}
     */
    public listen(port: number, hostname: string, callback: Function): void {
        Constellation.server.listen(port, hostname, () => {
            callback();
        });
    }

    public ip(request: http.IncomingMessage): string | string[] | undefined {
        return request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    }
    
}