<script>
    window.__maloon__.routerInitialized()
</script>

<main>
    {#if $window.__maloon__.CurrentPageComponent}
        <svelte:component this={$window.__maloon__.CurrentPageComponent}></svelte:component>
    {/if}
</main>