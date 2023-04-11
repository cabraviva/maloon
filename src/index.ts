type PageDefinition = {
    pages: {
        [key: string]: string
    },
    main?: string
    current?: string
}

/**
 * Use this function to provide all pages used on the current page, so maloon knows
   which pages should be prefixed
 */
export function definePages (pages: PageDefinition | string[]): void {
    console.log('No functionality yet...')
}