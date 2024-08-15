import Route from "../components/Route";
import { Method } from "../Constellation";

export default new Route(Method.GET, "/api/users", (api: string) => console.log("Route accessed"))