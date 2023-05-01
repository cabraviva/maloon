<script lang="ts">
    /**
     * Route name or path to preload when element is visible
     */
    export let on: string

    if (typeof on !== 'string') throw new TypeError('on has to be of type string at <Depends>')

    let element: HTMLDivElement
    
    if (!window.__maloon__.wantsToSaveData()) {
        if (typeof (IntersectionObserver) !== "undefined") {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        observer.unobserve(element)
                        // Prefetch page
                        window.__maloon__.lpc(on)
                    }
                })
            })
            observer.observe(element)
        } else {
            console.warn('Browser doesn\'t support IntersectionObserver, won\'t preload pages')
        }
    }
</script>

<main>
    <div bind:this={element}>
        <slot></slot>
    </div>
</main>