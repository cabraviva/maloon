export function wantsToSaveData() {
    try {
        if ('connection' in navigator) {
            // @ts-expect-error
            if (navigator.connection.saveData) {
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    } catch {
        return false
    }
}

interface RegisteredRoute {
    contentFunc: Function,
    path: string,
    name: string,
    content?: any
}

/**
 * Tries to resolve a RegisteredRoute based on nme or path.
 * If none was found, returns null
 */
export function resolvePageObject (nameOrPath: string): RegisteredRoute | null {
    if (window.__maloon__.routes[nameOrPath]) {
        // Found by path
        return window.__maloon__.routes[nameOrPath]
    }

    // Search by name
    for (const RR of Object.values(window.__maloon__.routes)) {
        if (RR.name === nameOrPath) return RR
    }

    return null
}

export function wasPagePrefetched (nameOrPath: string): boolean {
    const rr = resolvePageObject(nameOrPath)
    if (!rr) return false
    return !!rr.content
}

export function resolveQueryString (qs?: string | URLSearchParams | object) {
    if (typeof qs === 'string') {
        return qs.startsWith('?') ? qs : '?' + qs
    } else if (qs instanceof URLSearchParams) {
        return `?${qs.toString()}`
    } else if (typeof qs === 'object') {
        // @ts-expect-error
        qs = new URLSearchParams(qs)
        return `?${qs.toString()}`
    } else {
        return ''
    }
}

export interface ParsedQueryString {
    [key: string]: string | number | boolean
}

export function parseQueryString (qs: string): ParsedQueryString {
    const parsed: ParsedQueryString = {}
    if (qs.startsWith('?')) qs = qs.substring(1)
    const segments = qs.split('&')
    for (const segment of segments) {
        const key = decodeURIComponent(segment.split('=')[0])
        let value: string | number | boolean = decodeURIComponent(segment.split('=')[1])

        if (/^([\d.]*)$/.test(value)) {
            // Number
            value = parseFloat(value)
        }

        // deepcode ignore IncompatibleTypesInComparison: <please specify a reason of ignoring this>
        if (value === 'true') value = true
        // deepcode ignore IncompatibleTypesInComparison: <please specify a reason of ignoring this>
        if (value === 'false') value = false

        parsed[key] = value
    }
    if (parsed[''] === 'undefined') delete parsed['']
    return parsed
}