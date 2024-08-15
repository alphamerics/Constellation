enum Primitive {
    UNKNOWN
}

export class I {
    constructor() {

    }

    /**
     * Checks element for all primitive types. If the element is one of the primitive types, element is returned in parsed format.
     * Otherwise, element is returned back as a string.
     * 
     * @param element 
     * @returns {string | number | bigint | boolean | null | undefined}
     */
    public static infer(element: string): string | number | bigint | boolean | null | undefined {
        const numberInference = this.inferNumber(element);
        if (numberInference !== Primitive.UNKNOWN) return numberInference;

        const specialInference = this.inferSpecial(element);
        if (specialInference !== Primitive.UNKNOWN) return specialInference;

        const jsonInference = this.inferJSON(element);
        if (jsonInference !== Primitive.UNKNOWN) return jsonInference;

        return element;
    }

    /**
     * Checks if element is a number, or a bigint. If element is one of those types, element is returned in parsed format.
     * 
     * @param element 
     * @returns {number | bigint | Primitive}
     * @private
     */
    private static inferNumber(element: string): number | bigint | Primitive {
        if (!isNaN(parseInt(element))) {
            if (parseInt(element) > Number.MAX_SAFE_INTEGER) return BigInt(element);

            return parseInt(element);
        }

        return Primitive.UNKNOWN;
    }

    /**
     * Checks if element is a boolean, null, or undefined value. If element is one of those types, element is returned in parsed format.
     * 
     * @param element 
     * @returns {boolean | null | undefined | Primitive}
     * @private
     */
    private static inferSpecial(element: string): boolean | null | undefined | Primitive {
        const lowerElement = element.toLowerCase();

        if (lowerElement === "true") return true;
        if (lowerElement === "false") return false;
        if (lowerElement === "null") return null;
        if (lowerElement === "undefined") return undefined;

        return Primitive.UNKNOWN;
    }

    /**
     * Checks if element is a json object or an array. If element is one of those type, element is returned in parsed format.
     * 
     * @param element 
     * @returns 
     * @private
     */
    private static inferJSON(element: string) {
        try {
            return JSON.parse(element);
        } catch {
            return Primitive.UNKNOWN;
        }
    }
}