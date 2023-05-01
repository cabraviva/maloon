// @ts-ignore
import { wantsToSaveData, resolvePageObject, resolveQueryString, wasPagePrefetched, type ParsedQueryString, parseQueryString } from './utils.ts'
import { writable } from 'svelte/store'

declare global {
    interface Window {
        __maloon__: {
            CurrentPageComponent: any,
            registerRoute(content: Function, path: string, name: string): void,
            routes: {
                [key: string]: RegisteredRoute
            },
            notFoundRoute?: Function,
            /**
             * Preloads a registered route
             */
            lpc(pageNameOrPath: string): Promise<void>,
            wantsToSaveData(): boolean,
            pagename: string,
            pagepath: string,
            popstateListenerInitialized: boolean,
            firstPageLoad: boolean,
            icbop: boolean,
            state: {
                [key: string]: StateCompatible
            },
            routerInitialized(): void
        }
    }
}

if (!window.__maloon__) {
    window.__maloon__ = {
        CurrentPageComponent: writable(null),
        registerRoute,
        routes: {},
        lpc: loadPageComponent,
        wantsToSaveData,
        pagename: null,
        pagepath: null,
        popstateListenerInitialized: false,
        firstPageLoad: true,
        icbop: false,
        state: {},
        routerInitialized() {
            loadState()
            onPageLoad()
            initialPageLoadHandler()
        }
    }
}

interface RegisteredRoute {
    contentFunc: Function,
    path: string,
    name: string,
    content?: SvelteComponent
}

function registerRoute (content: Function, path: string, name: string): void {
    window.__maloon__.routes[path] = {
        contentFunc: content,
        path,
        name,
    }
}

async function loadPageComponent (nameOrPath: string): Promise<void> {
    const rr = resolvePageObject(nameOrPath)
    if (!rr) throw new Error('Couldn\'t find a registered page with the name or path of ' + nameOrPath)
   
    const content = (await rr.contentFunc()).default

    window.__maloon__.routes[rr.path] = {
        name: rr.name,
        path: rr.path,
        contentFunc: rr.contentFunc,
        content
    }
}

import Router from './Router.svelte'
import Route from './Route.svelte'
import Page from './Page.svelte'
import NotFound from './NotFound.svelte'
import Prelaod from './Preload.svelte'
import Depends from './Depends.svelte'
import type { SvelteComponent } from 'svelte'
import Default404Page from './Default404Page.svelte'

function goToNonSameOriginPage (url: string) {
    saveState()
    // @ts-expect-error
    window.location = url
}

async function accessLocalPage (rr: RegisteredRoute, fresh: boolean) {
    if (fresh) {
        // Load page again
        await loadPageComponent(rr.path)
    } else {
        // Check if page was already loaded
        if (!wasPagePrefetched(rr.path)) {
            // Load page
            await loadPageComponent(rr.path)
        }
    }

    // Update P() metadata
    window.__maloon__.pagename = rr.name
    window.__maloon__.pagepath = rr.path

    // Update Page Component
    onPageLoad()
    rr = resolvePageObject(rr.path)
    window.__maloon__.CurrentPageComponent.set(rr.content)
}

/**
 * Navigates to a different page / route
 * @param page A page name, a page path or an absolute url to an external website
 * @param queryString Here you can optionally provide a queryString
 */
async function navigate (page: string, queryString?: URLSearchParams | string | object) {
    const qs = resolveQueryString(queryString)
    if (page.startsWith(':') || page.startsWith('//') || page.startsWith('http')) {
        return goToNonSameOriginPage(page)
    }
    const rr = resolvePageObject(page)
    const path = rr.path + qs
    await accessLocalPage(rr, false)
    window.history.pushState({}, '', path)
}

/**
 * Navigates to a different page / route and enforces a fresh component load. This can be useful when javascript is renderd on the server
 * @param page A page name, a page path or an absolute url to an external website
 * @param queryString Here you can optionally provide a queryString
 */
async function navigateFresh(page: string, queryString?: URLSearchParams | string | object) {
    const qs = resolveQueryString(queryString)
    if (page.startsWith(':') || page.startsWith('//') || page.startsWith('http')) {
        return goToNonSameOriginPage(page)
    }
    const rr = resolvePageObject(page)
    const path = rr.path + qs
    await accessLocalPage(rr, true)
    window.history.pushState({}, '', path)
}

/**
 * Opens a new tab with the specified page / route
 * @param page A page name, a page path or an absolute url to an external website
 * @param queryString Here you can optionally provide a queryString
 */
function open (page: string, queryString?: URLSearchParams | string | object): PageInfo {
    const qs = resolveQueryString(queryString)
    let p: Window
    let rr: undefined | RegisteredRoute
    if (page.startsWith(':') || page.startsWith('//') || page.startsWith('http')) {
        window.localStorage.setItem('__maloon_icbop__', 'true')
        saveState()
        p = window.open(page + qs)
    } else {
        rr = resolvePageObject(page)
        window.localStorage.setItem('__maloon_icbop__', 'true')
        saveState()
        const path = rr.path + qs
        
        p = window.open(path)
    }

    return {
        name: rr ? rr.name : page,
        path: rr ? rr.path : page,
        query: parseQueryString(qs),
        close: p.close,
        isControlledByOtherPage() {
            return true
        },
        refresh() {
            p.location = p.location.toString()
        },
        back: p.history.back,
        forward: p.history.forward
    }
}

interface PageInfo {
    /**
     * Name of the current page
     */
    name: string,
    /**
     * Path of the current page
     */
    path: string,
    /**
     * An object containing the parsed query string
     */
    query: ParsedQueryString,
    /**
     * Closes the current page, if it was opened by another page.
     * If not, silently does nothing
     */
    close(): void,
    /**
     * Shows whether the page was opened by another page (e.g. using open())
     */
    isControlledByOtherPage(): boolean,
    /**
     * Refreshes the current page
     * @donotuse This shouldn't be used in most cases
     */
    refresh(): void,
    /**
     * Navigates one step back. If not possible, silently does nothing
     */
    back(): void
    /**
     * Navigates one step forward. If not possible, silently does nothing
     */
    forward(): void
}

function P(): PageInfo {
    return {
        name: window.__maloon__.pagename,
        path: window.__maloon__.pagepath,
        query: parseQueryString(window.location.search),
        close () {
            if (P().isControlledByOtherPage()) {
                window.close()
            }
        },
        isControlledByOtherPage() {
            return window.__maloon__.icbop
        },
        refresh () {
            // @ts-expect-error
            window.location = window.location.toString()
        },
        back() {
            window.history.back()
        },
        forward() {
            window.history.forward()
        },
    }
}

function onPageLoad () {
    const _icbop = window.localStorage.getItem('__maloon_icbop__')
    if (_icbop === 'true') {
        window.__maloon__.icbop = true
        window.localStorage.removeItem('__maloon_icbop__')
    }
}

if (!window.__maloon__.popstateListenerInitialized) {
    window.__maloon__.popstateListenerInitialized = true
    window.addEventListener('popstate', () => {
        accessLocalPage(resolvePageObject(window.location.pathname), false)
    })
}

type StateCompatibleObject = {
    [key: string]: StateCompatible
}
type StateCompatible = string | null | number | boolean | StateCompatible[] | StateCompatibleObject
/**
 * Saves current state so that it can be recovered on reload. 
 * NOTE: This is done automatically when using open() or navigating to an external page.
 * NOTE2: State will only be saved for the current browser session
 */
export function saveState() {
    const serialized = JSON.stringify(window.__maloon__.state)
    localStorage.setItem('__maloon_state__', serialized)
}

/**
 * Loads stored state.
 * NOTE: This will be done automatically when using definePages()
 */
export function loadState() {
    const storage = window.localStorage.getItem('__maloon_state__')
    if (typeof storage === 'string') {
        const parsed = JSON.parse(storage)
        window.__maloon__.state = parsed
        clearSavedState()
    }
}

function clearSavedState() {
    window.localStorage.removeItem('__maloon_state__')
}

/**
 * Stores a value in the state
 * @param key Key for the data
 * @param value Whatever you want to save. Just make sure it's JSON serializabile
 * @example setState('key', 'value')
 */
export function setState(key: string | number, value: StateCompatible) {
    if (value === undefined) value = null
    window.__maloon__.state[key.toString()] = value
}

/**
 * Retrieves some data from the state
 * @param key Key for the data
 * @returns {StateCompatible} Anything that is JSON serializable
 * @example getState('key')
 */
export function getState(key: string | number): StateCompatible {
    return window.__maloon__.state[key.toString()]
}

export const state = {
    get: getState,
    set: setState,
    save: saveState,
    load: loadState
}

const initialPageLoadHandler = async () => {
    if (window.__maloon__.firstPageLoad === true) {
        window.__maloon__.firstPageLoad = false
        const { pathname } = window.location
        try {
            const rr = resolvePageObject(pathname)
            await accessLocalPage(rr, false)
        } catch {
            // Load 404 page
            if (typeof window.__maloon__.notFoundRoute === 'function') {
                registerRoute(window.__maloon__.notFoundRoute, '/__404__', '__404__')
                await accessLocalPage({
                    contentFunc: window.__maloon__.notFoundRoute,
                    name: '__404__',
                    path: '/__404__'
                }, true)
            } else {
                // Load default 404 page
                registerRoute(() => {
                    return Default404Page
                }, '/__404__', '__404__')
                await accessLocalPage({
                    contentFunc: () => {
                        return Default404Page
                    },
                    name: '__404__',
                    path: '/__404__'
                }, true)
            }
        }
    }
}

export {
    Router,
    Route,
    Page,
    NotFound,
    Prelaod,
    Depends,
    navigate,
    navigateFresh,
    open,
    P
}