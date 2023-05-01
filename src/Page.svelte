<script>
    window.__maloon__.routerInitialized()
    const store = window.__maloon__.CurrentPageComponent
</script>

<main>
    {#if $store}
        <svelte:component this={$store}></svelte:component>
    {/if}
</main>