// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

/**
 *
 * @param {string} input
 * @returns {boolean}
 */
export function goodString(input) {
    return input && typeof input === "string" && input.length > 0;
}

export function badString(input) {
    return !goodString(input);
}

export function goodUrl(url) {
    try {
        if (goodString(url)) {
            let url1 = new URL(url);
            return url1.protocol.indexOf("http") > -1;
        }
    } catch (e) {
        return false;
    }
}

export function goodArray(input) {
    return typeof input !== "undefined" && Array.isArray(input) && input.length > 0;
}

export function goodObject(input) {
    return typeof input === "object" && Object.keys(input).length > 0;
}

export function badObject(input) {
    return !goodObject(input);
}

export function goodNumber(input) {
    return typeof input === "number" && !isNaN(input) && input !== Infinity && input !== -Infinity;
}

export function badNumber(input) {
    return !goodNumber(input);
}
