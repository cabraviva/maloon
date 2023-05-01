<script lang="ts">
    export let name = 'Unknown Page'
    export let content: Function
    export let path = '/'

    window.__maloon__.registerRoute(content, path, name)
</script>