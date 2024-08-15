import Formation from "../components/Formation";

function test(value: boolean) {
    console.log(value)
    return { success: value }
}

export default new Formation({ prefix: "/example" })
    .get('/hello/:value', (value: boolean) => test(value))
    .get('/test', () => console.log("/EXAMPLE/TEST - ROUTE ACCESSED"));