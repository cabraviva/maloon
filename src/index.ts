declare global {
    interface Window {
        __maloon__: {
            fetchedPages: {
                [key: string]: any
            },
            mainPage: string,
            currentPage: string,
            lastRouteFetchSucessful: boolean,
            popStateListenerInitialized: boolean,
            provideHint(url: string): Promise<boolean>,
            state: {
                [key: string]: StateCompatible
            },
            icbop: boolean,
            getPageName(): string,
            navigate(uop: string): Promise<void>,
            open(uop: string): PageInfoO,
            freshNavigate(uop: string): Promise<void>,
            getPageObj(): PageInfo
        }
    }
}

type StateCompatibleObject = {
    [key: string]: StateCompatible
}
type StateCompatible = string | null | number | boolean | StateCompatible[] | StateCompatibleObject


if (!window.__maloon__) {
    // @ts-ignore
    window.__maloon__ = {
        fetchedPages: {},
        mainPage: 'index',
        lastRouteFetchSucessful: true,
        popStateListenerInitialized: false,
        state: {},
        icbop: false,
        async provideHint (url: string) {
            return await prefetchPage(url, url)
        },
        getPageName () {
            let name = 'index'
            if (window.__maloon__.currentPage) {
                if (name === 'index') name = window.location.pathname
                if (determineCurrentPageBasedOnURLNoDefIndex(window.__maloon__.fetchedPages) === 'index') name = 'index'
            } else {
                name = determineCurrentPageBasedOnURL(window.__maloon__.fetchedPages)
                if (name === 'index') name = window.location.pathname
                if (determineCurrentPageBasedOnURLNoDefIndex(window.__maloon__.fetchedPages) === 'index') name = 'index'
            }
            return name
        },
        navigate (uop: string) {
            return navigate(uop)
        },
        getPageObj() {
            return Page()
        },
        open(uop: string) {
            return open(uop)
        },
        freshNavigate (uop: string) {
            return freshNavigate(uop)
        }
    }
}

type PageDefinition = {
    /**
     * Pages object including all pages that might have , should be structured like this
     */
    pages: {
        [key: string]: string
    },
    /**
     * Page that should be used when path is '/'
     * @default 'index'
     */
    main?: string
    /**
     * Current page. If ommited maloon will try to retrieve it from the url.
     * If that isn't possible it will default to 'index'
     * @default 'index'
     */
    current?: string
}

function determineCurrentPageBasedOnURL (pages: object) {
    if (typeof pages[window.location.pathname.substring(1)] === 'string') {
        // Found one
        return window.location.pathname.substring(1)
    } else {
        const matchingPages = Object.entries(pages).filter(entry => entry[1] === window.location.pathname)
        if (matchingPages.length > 0) {
            // Found matching page
            return matchingPages[0][0]
        } else {
            return 'index'
        }
    }
}

function determineCurrentPageBasedOnURLNoDefIndex(pages: object) {
    if (typeof pages[window.location.pathname.substring(1)] === 'string') {
        // Found one
        return window.location.pathname.substring(1)
    } else {
        const matchingPages = Object.entries(pages).filter(entry => entry[1] === window.location.pathname)
        if (matchingPages.length > 0) {
            // Found matching page
            return matchingPages[0][0]
        } else {
            return null
        }
    }
}

function funcToDataUrl (func: Function, data?: any[]) {
    if (!(data instanceof Array)) data = []
    const functionString = `"use strict";\n;(${func})(${data.map(e => {
        if (typeof e === 'function') {
            return `(${e})`
        } else {
            return JSON.stringify(e)
        }
    }).join(', ')});`
    const url = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(functionString)))}`
    return url
}

function getAttributesOfAllTags(html: string, tagName: string): { [key: string]: string; _content: string }[] {
    const attributeList: { [key: string]: string; _content: string }[] = []
    let startIndex = 0
    let endIndex = 0

    while (true) {
        startIndex = html.indexOf(`<${tagName}`, endIndex)
        endIndex = html.indexOf(`>`, startIndex)

        if (startIndex === -1 || endIndex === -1) {
            break
        }

        const tag = html.substring(startIndex, endIndex)
        // @ts-expect-error: Not anymore
        const attributes: { [key: string]: string; _content: string } = tag
            .match(/([^\s=]+)(="([^"]*)")?/g)
            .reduce((acc, attribute) => {
                const [name, value] = attribute.split('=')
                acc[name] = value ? value.replace(/"/g, '') : ''
                return acc
            }, {})

        attributes._content = html.substring(endIndex + 1, html.indexOf(`</${tagName}>`, endIndex)).replace(/\\r\\n/g, '\n').trim()

        attributeList.push(attributes)

        endIndex += 1
    }

    return attributeList
}

function retrieveInnerOfTag (html: string, tagName: string) {
    const startIndex = html.indexOf(`<${tagName}>`)
    const endIndex = html.indexOf(`</${tagName}>`)

    return html.substring(startIndex + `<${tagName}>`.length, endIndex).replace(/\\r\\n/g, '\n').trim()
}

function retrieveInnerOfAllTags(html: string, tagName: string) {
    const innerHtmlList = []
    let startIndex = 0
    let endIndex = 0

    while (true) {
        startIndex = html.indexOf(`<${tagName}>`, endIndex)
        endIndex = html.indexOf(`</${tagName}>`, startIndex)

        if (startIndex === -1 || endIndex === -1) {
            break
        }

        const innerHtml = retrieveInnerOfTag(html, tagName)
        innerHtmlList.push(innerHtml)

        html = html.substring(0, startIndex) + html.substring(endIndex + `</${tagName}>`.length)
        endIndex = startIndex
    }

    return innerHtmlList
}

function removeEveryTag(html: string, tagName: string): string {
    let startIndex = 0
    let endIndex = 0
    let result = ''

    while ((startIndex = html.indexOf(`<${tagName}`, endIndex)) !== -1) {
        result += html.substring(endIndex, startIndex)
        endIndex = html.indexOf(`</${tagName}>`, startIndex) + `</${tagName}>`.length
    }

    result += html.substring(endIndex)

    return result
}

async function fetchPage (url: string, origin = '', retrieveInnerOfTag: Function, retrieveInnerOfAllTags: Function, getAttributesOfAllTags: Function, removeEveryTag: Function) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.addEventListener('load', function () {
            if (xhr.status.toString().startsWith('2')) {
                let title: string = ''
                
                let head = retrieveInnerOfTag(xhr.responseText.replace(/\r/g, ''), 'head')
                let body = retrieveInnerOfTag(xhr.responseText.replace(/\r/g, ''), 'body')

                const innerTitle = retrieveInnerOfTag(head, 'title')
                if (innerTitle) {
                    title = innerTitle
                }
                
                const headScriptTags: object[] = getAttributesOfAllTags(head, 'script')
                head = removeEveryTag(head, 'script')

                type Preloadable = {
                    url: string,
                    type: string
                }

                let preloadableURLs: Preloadable[] = []
                getAttributesOfAllTags(head, 'link').forEach((element: { [key: string]: string }) => {
                    if (element.href) {
                        preloadableURLs.push({
                            url: element.href,
                            type: element.rel
                        })
                    }
                })

                let headContent = head

                let bodyScriptTags: object[] = getAttributesOfAllTags(body, 'script')
                body = removeEveryTag(body, 'script')

                let bodyContent = body
                
                try {
                    window.__maloon__.lastRouteFetchSucessful = true
                } catch {
                    postMessage('SET_LRFS=1')
                }

                resolve({
                    pageContent: xhr.responseText.replace(/\r/g, '').trim(),
                    title,
                    head,
                    body,
                    headContent,
                    headScriptTags,
                    bodyContent,
                    bodyScriptTags,
                    preloadableURLs
                })
            } else {
                try {
                    window.__maloon__.lastRouteFetchSucessful = false
                } catch {
                    postMessage('SET_LRFS=0')
                }
                resolve({})
            }
        })

        xhr.addEventListener('error', (err) => {
            reject(err)
        })

        if (!(url.startsWith('http') || url.startsWith(':') || url.startsWith('//'))) url = origin + url

        xhr.open('GET', url)
        xhr.send()
    })
}

function watchForMaloonHints () {
    if (typeof (IntersectionObserver) !== "undefined" && !wantsToSaveData()) {
        const elementsWithHint = document.querySelectorAll('*[maloonhint]')
        for (const ewh of elementsWithHint) {
            if (ewh.getAttribute('data-maloon-is-observed') !== 'true') {
                ewh.setAttribute('data-maloon-is-observed', 'true')
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            observer.unobserve(ewh)
                            prefetchPage(entry.target.getAttribute('maloonhint'), entry.target.getAttribute('maloonhint'))
                        }
                    })
                })
                observer.observe(ewh)
            }
        }
    }
}

async function prefetchPage (url: string, pageName?: string): Promise<boolean> {
    return new Promise(resolve => {
        if (!(url.startsWith('http') || url.startsWith(':') || url.startsWith('/'))) {
            url = `/${url}`
        }
        if (typeof (Worker) !== "undefined") {
            const worker = new Worker(funcToDataUrl(async function (url: string, pageName: string, fetchPage: Function, origin: string, retrieveInnerOfTag: Function, retrieveInnerOfAllTags: Function, getAttributesOfAllTags: Function, removeEveryTag: Function) {
                // We are inside of a seperate thread 👍
                const fetchedPages = {}
                fetchedPages[pageName] = {
                    url,
                    fetched: await fetchPage(url, origin, retrieveInnerOfTag, retrieveInnerOfAllTags, getAttributesOfAllTags, removeEveryTag)
                }
                postMessage(fetchedPages)
            }, [
                url,
                pageName ?? url,
                fetchPage,
                window.location.origin,
                retrieveInnerOfTag,
                retrieveInnerOfAllTags,
                getAttributesOfAllTags,
                removeEveryTag
            ]))
            worker.onmessage = ({ data: fetchedPages }) => {
                if (fetchedPages === 'SET_LRFS=1') {
                    window.__maloon__.lastRouteFetchSucessful = true
                    return
                }
                if (fetchedPages === 'SET_LRFS=0') {
                    window.__maloon__.lastRouteFetchSucessful = false
                    return
                }

                // Prefetched all pages
                worker.terminate()
                window.__maloon__.fetchedPages = {
                    ...window.__maloon__.fetchedPages,
                    ...fetchedPages
                }

                resolve(true)

                // Prefetch resources (e.g. styles)
                for (const page of Object.values(fetchedPages)) {
                    // @ts-expect-error
                    for (const resource of page.fetched.preloadableURLs) {
                        const link = document.createElement('link')
                        link.rel = 'prefetch'
                        link.href = resource.url
                        link.as = resource.type
                        document.head.appendChild(link)
                    }
                }
            }
        }
    })
}

/**
 * Use this function to provide all pages used on the current page, so maloon knows
   which pages should be prefixed
 */
export function definePages (pages: PageDefinition | string[]): void {
    setTimeout(() => watchForMaloonHints(), 50)
    setTimeout(() => watchForMaloonHints(), 1500)

    if (!window.__maloon__.popStateListenerInitialized) {
        window.__maloon__.popStateListenerInitialized = true
        window.addEventListener('popstate', () => {
            loadLocalPage(window.location.pathname, '', true)
        })
    }

    if (window.localStorage.getItem('__maloon_icbop__') === 'true') {
        window.localStorage.removeItem('__maloon_icbop__')
        window.__maloon__.icbop = true
    } else {
        window.__maloon__.icbop = false
    }

    loadState()

    if (pages instanceof Array) {
        // Simple definePages
        const pagesObject = {}
        for (const page of pages) {
            pagesObject[page] = `/${page}`
        }

        pages = {
            pages: pagesObject,
            main: 'index',
            current: determineCurrentPageBasedOnURL(pagesObject)
        }
    }
    pages.current ||= determineCurrentPageBasedOnURL(pages.pages)
    pages.main ||= 'index'
    window.__maloon__.mainPage = pages.main
    window.__maloon__.currentPage = pages.current

    // Start prefetching them
    const entr = {}
    for (const pn of Object.keys(pages.pages)) {
        entr[pn] = {}
    }

    window.__maloon__.fetchedPages = {
        ...window.__maloon__.fetchedPages,
        ...entr
    }
    if (typeof (Worker) !== "undefined" && !wantsToSaveData()) {
        const worker = new Worker(funcToDataUrl(async function (pages: PageDefinition, fetchPage: Function, origin: string, retrieveInnerOfTag: Function, retrieveInnerOfAllTags: Function, getAttributesOfAllTags: Function, removeEveryTag: Function) {
            // We are inside of a seperate thread 👍
            const fetchedPages = {}
            for (const [pageName, url] of Object.entries(pages.pages)) {
                if (pageName !== pages.current) {
                    fetchedPages[pageName] = {
                        url,
                        fetched: await fetchPage(url, origin, retrieveInnerOfTag, retrieveInnerOfAllTags, getAttributesOfAllTags, removeEveryTag)
                    }
                }
            }
            postMessage(fetchedPages)
        }, [
            pages,
            fetchPage,
            window.location.origin,
            retrieveInnerOfTag,
            retrieveInnerOfAllTags,
            getAttributesOfAllTags,
            removeEveryTag
        ]))
        worker.onmessage = ({ data: fetchedPages }) => {
            if (fetchedPages === 'SET_LRFS=1') {
                window.__maloon__.lastRouteFetchSucessful = true
                return
            }
            if (fetchedPages === 'SET_LRFS=0') {
                window.__maloon__.lastRouteFetchSucessful = false
                return
            }
            // Prefetched all pages
            worker.terminate()
            window.__maloon__.fetchedPages = {
                ...window.__maloon__.fetchedPages,
                ...fetchedPages
            }

            // Prefetch resources (e.g. styles)
            for (const page of Object.values(fetchedPages)) {
                // @ts-expect-error
                for (const resource of page.fetched.preloadableURLs) {
                    const link = document.createElement('link')
                    link.rel = 'prefetch'
                    link.href = resource.url
                    link.as = resource.type
                    document.head.appendChild(link)
                }
            }
        }
    }
    // No Web Worker support...
    // Won't prefetch any pages then
}

function dispatchDomReady () {
    return window.dispatchEvent(new Event("DOMContentLoaded"))
}

function wantsToSaveData() {
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
}

function loadActualPageBasedOnData (data: {[key: string]: any}, queryString?: string, keepHistory = false) {
    const { fetched } = data
    data.url = data.url + (queryString || '')
    if (!keepHistory) {
        window.history.pushState({
            pathname: data.pathname || data.url || undefined
        }, '', data.url)
    }
    document.querySelector('title').innerText = fetched.title
    document.querySelector('head').innerHTML = fetched.headContent
    document.querySelector('body').innerHTML = fetched.bodyContent
    for (const hst of fetched.headScriptTags) {
        const tag = document.createElement('script')
        if (hst.src) tag.src = hst.src
        tag.innerHTML = hst._content || ''
        tag.noModule = hst.nomodule
        tag.type = hst.type
        tag.defer = hst.defer || false
        document.head.appendChild(tag)
    }
    for (const bst of fetched.bodyScriptTags) {
        const tag = document.createElement('script')
        if (bst.src) tag.src = bst.src
        tag.innerHTML = bst._content || ''
        tag.noModule = bst.nomodule
        tag.type = bst.type
        tag.defer = bst.defer || false
        document.body.appendChild(tag)
    }
    dispatchDomReady()
}

async function loadLocalPage (urlOrPageName: string, queryString: string, keepHistory = false) {
    if (urlOrPageName.startsWith('http') || urlOrPageName.startsWith(':') || urlOrPageName.startsWith('//')) {
        // External site
        // @ts-expect-error
        window.location = urlOrPageName
    }
    
    let pageData: {[key:string]: any} = {}

    // Main Page
    if (urlOrPageName === '' || urlOrPageName === '/') urlOrPageName = window.__maloon__.mainPage
    
    window.__maloon__.currentPage = urlOrPageName
    
    // Check if pageName is prefetched 
    if (urlOrPageName in window.__maloon__.fetchedPages) {
        pageData = window.__maloon__.fetchedPages[urlOrPageName]
    } else {
        // Check if some prefetched page has a matching url
        for (const data of Object.values(window.__maloon__.fetchedPages)) {
            if (data.url === urlOrPageName) {
                pageData = data
            }
        }
    }

    if (!pageData.url) {
        // Page not prefetched, doing now...
        try {
            await prefetchPage(urlOrPageName)
        } catch {
            // Fallback: Normal page load
            // @ts-expect-error
            window.location = `${window.location.origin}${pageData.url || (urlOrPageName.startsWith('/') ? urlOrPageName : '/' + urlOrPageName)}${queryString || ''}`
        }
        if (window.__maloon__.lastRouteFetchSucessful) {
            await loadLocalPage(urlOrPageName, queryString)
        } else {
            // Fallback: Normal page load
            // @ts-expect-error
            window.location = `${window.location.origin}${pageData.url || (urlOrPageName.startsWith('/') ? urlOrPageName : '/' + urlOrPageName)}${queryString || ''}`
        }
    } else {
        pageData.pathname = urlOrPageName
        loadActualPageBasedOnData(pageData, queryString, keepHistory)
    }
}

/**
 * Use this function to navigate to a page (for example when a button was clicked)
 * @example navigate('index'); navigate('/my-page/234')
 * @param urlOrPageName The pagename / url to load
 * @param queryString The queryString to append to the url. Could be: ?key=value&x=1 If you'r page renders differently serverside based on this, directly include it into the first argument
 */
export async function navigate (urlOrPageName: string, queryString?: string) {
    await loadLocalPage(urlOrPageName, queryString || '', false)
}

/**
 * Use this function to navigate to a page which has to be fetched just in time,
 * for example if data might have changed or changes often.
 * NOTE: This will lead to a slower page load
 * @example freshNavigate('index'); freshNavigate('/my-page/234')
 */
export async function freshNavigate(urlOrPageName: string, queryString?: string) {
    if (urlOrPageName.startsWith('http') || urlOrPageName.startsWith(':') || urlOrPageName.startsWith('//')) {
        // External site
        // @ts-expect-error
        window.location = urlOrPageName
    }

    queryString ||= ''
    let pageData: { [key: string]: any } = {}

    // Main Page
    if (urlOrPageName === '' || urlOrPageName === '/') urlOrPageName = window.__maloon__.mainPage

    window.__maloon__.currentPage = urlOrPageName

    if (urlOrPageName in window.__maloon__.fetchedPages) {
        urlOrPageName = window.__maloon__.fetchedPages[urlOrPageName].url || urlOrPageName
    }

    // Page not prefetched, doing now...
    try {
        await prefetchPage(urlOrPageName)
    } catch {
        // Fallback: Normal page load
        // @ts-expect-error
        window.location = `${window.location.origin}${pageData.url || (urlOrPageName.startsWith('/') ? urlOrPageName : '/' + urlOrPageName)}${queryString || ''}`
    }
    if (window.__maloon__.lastRouteFetchSucessful) {
        await loadLocalPage(urlOrPageName, queryString)
    } else {
        // Fallback: Normal page load
        // @ts-expect-error
        window.location = `${window.location.origin}${pageData.url || (urlOrPageName.startsWith('/') ? urlOrPageName : '/' + urlOrPageName)}${queryString || ''}`
    }
}

interface PageInfoO extends PageInfo {
    /**
     * Registers an event handler waiting for the page to close
     * @param handler The event handler function
     */
    onclose (handler: Function): void
}

/**
 * Opens a page in a new tab
 * @param urlOrPageName Pagename / URL to open
 * @param queryString Query string to use (Supported but not recommended)
 * @returns {PageInfo} Page() return value of the opened page
 */
export function open(urlOrPageName: string, queryString?: string): PageInfoO {
    window.localStorage.setItem('__maloon_icbop__', 'true')
    saveState()
    let url = urlOrPageName
    if (urlOrPageName.startsWith('http') || urlOrPageName.startsWith(':') || urlOrPageName.startsWith('//')) {
        // External site
        url = urlOrPageName
    } else {
        // Internal site
        queryString ||= ''
        // Main Page
        if (urlOrPageName === '' || urlOrPageName === '/') url = window.__maloon__.mainPage

        if (urlOrPageName in window.__maloon__.fetchedPages) {
            url = window.__maloon__.fetchedPages[urlOrPageName].url || urlOrPageName
        }

        if (!url.startsWith('/')) url = `/${url}`
    }

    const page = window.open(url)
    let wclosedhandlers = []

    const timer = setInterval(() => {
        if (page.closed) {
            clearInterval(timer)
            for (const h of wclosedhandlers) {
                h()
            }
            wclosedhandlers = []
        }
    }, 500)

    let name: string
    try {
        name = page.__maloon__.getPageName()
    } catch {
        name = url
    }

    return {
        close () {
            page.close()
        },
        isControlledByOtherPage () {
            return true
        },
        refresh () {
            page.location = url
        },
        name,
        back () {
            page.history.back()
        },
        forward () {
            page.history.forward()
        },
        onclose(handler: Function) {
            wclosedhandlers.push(handler)
        }
    }
}

interface PageInfo {
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
    name: string,
    /**
     * Navigates one step back. If not possible, silently does nothing
     */
    back(): void
    /**
     * Navigates one step forward. If not possible, silently does nothing
     */
    forward(): void
}

window.__maloon__.getPageName()

/**
 * Returns information and methods regarding the current page
 */
export function Page (): PageInfo {
    let name = 'index'
    if (window.__maloon__.currentPage) {
        if (name === 'index') name = window.location.pathname
        if (determineCurrentPageBasedOnURLNoDefIndex(window.__maloon__.fetchedPages) === 'index') name = 'index'
    } else {
        name = determineCurrentPageBasedOnURL(window.__maloon__.fetchedPages)
        if (name === 'index') name = window.location.pathname
        if (determineCurrentPageBasedOnURLNoDefIndex(window.__maloon__.fetchedPages) === 'index') name = 'index'
    }
    return {
        close() {
            if (Page().isControlledByOtherPage()) {
                // Close page
                window.close()
            }
        },
        isControlledByOtherPage() {
            return window.__maloon__.icbop
        },
        refresh() {
            // @ts-expect-error
            window.location = window.location.toString()
        },
        name,
        back() {
            window.history.back()
        },
        forward() {
            window.history.forward()
        }
    }
}

/**
 * Saves current state so that it can be recovered on reload. 
 * NOTE: This is done automatically when using open() or navigating to an external page.
 * NOTE2: State will only be saved for the current browser session
 */
export function saveState () {
    const serialized = JSON.stringify(window.__maloon__.state)
    localStorage.setItem('__maloon_state__', serialized)
}

/**
 * Loads stored state.
 * NOTE: This will be done automatically when using definePages()
 */
export function loadState () {
    const storage = window.localStorage.getItem('__maloon_state__')
    if (typeof storage === 'string') {
        const parsed = JSON.parse(storage)
        window.__maloon__.state = parsed
        clearSavedState()
    }
}

function clearSavedState () {
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
export function getState (key: string | number): StateCompatible {
    return window.__maloon__.state[key.toString()]
}

export const state = {
    get: getState,
    set: setState,
    save: saveState,
    load: loadState
}

/**
* Navigates one step back. If not possible, silently does nothing
*/
export function goBack () {
    Page().back()
}

/**
* Navigates one step forward. If not possible, silently does nothing
*/
export function goForward () {
    Page().forward()
}

// Components
import Link from './components/Link.svelte'
import BackBtn from './components/BackBtn.svelte'
import ForwardBtn from './components/ForwardBtn.svelte'

export {
    Link, 
    BackBtn,
    ForwardBtn
}