<script lang="ts">
    function clicked () {
        window.__maloon__.getPageObj().forward()
    }
</script>

<main>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div on:click={clicked}>
        <slot>
            <button>Forward</button>
        </slot>
    </div>
</main>