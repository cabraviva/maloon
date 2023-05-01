<script lang="ts">
    /**
     * Name or path of the route that will be preloaded
     */
    export let route: string

    if (!window.__maloon__.wantsToSaveData()) window.__maloon__.lpc(route)
</script>