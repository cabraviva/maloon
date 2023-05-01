<script lang="ts">
    import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

    export let text = 'Pass in a text property!'
    export let fresh = false
    export let newtab = false
    export let url: string
    export let styles = ''

    if (!fresh) window.__maloon__.provideHint(url)

    function clicked () {
        if (newtab) {
            const page = window.__maloon__.open(url)
            page.onclose(() => {
                dispatch('close')
            })
        } else {
            if (fresh) {
                window.__maloon__.freshNavigate(url)
            } else {
                window.__maloon__.navigate(url)
            }
        }
        dispatch('click')
    }
</script>

<main>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div on:click={clicked}>
        <slot>
            <button style={styles}>{text}</button>
        </slot>
    </div>
</main>