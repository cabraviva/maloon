<main>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;text-align:center;">
        <h1>404 - Page not found</h1>
        <p>We tried to look everywhere, but we couldn't find {window.location.pathname} 🙁</p>
        <br>
        <hr>
        <br>
        <p>If you want to change this page, add the following inside of your Router:</p>
        <pre>&lt;NotFound content=&#123;() => import('./Your404Page.svelte')&#125; /&gt;</pre>
    </div>
</main>