function renderSidebar({ active, prefix = "" }) {
  const links = [
    ["games", "games.html", "ゲーム記録"],
    ["gallery", "gallery.html", "ギャラリー"],
    ["blog", "blog.html", "ブログ"],
    ["accounts", "accounts.html", "アカウント"],
  ];

  const nav = links.map(([name, href, label]) => {
    const current = active === name ? ' aria-current="page"' : "";
    return `      <a href="${prefix}${href}"${current}>${label}</a>`;
  }).join("\n");

  return `<!-- component:sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <a class="site-brand" href="${prefix}index.html"><img src="${prefix}favicon.ico" alt="" width="32" height="32"><span>kn_iidx</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="メニューを開く"><span></span><span></span><span></span></button>
    </div>
    <nav id="main-nav" aria-label="メインナビゲーション">
${nav}
      <div class="sidebar-social" aria-label="ソーシャルリンク">
        <a rel="me noopener" href="https://x.com/kn_iidx" target="_blank"><img src="https://cdn.simpleicons.org/x/666" alt="" width="14" height="14">X</a>
        <a rel="me noopener" href="https://www.twitch.tv/kn_iidx" target="_blank"><img src="https://cdn.simpleicons.org/twitch/666" alt="" width="14" height="14">Twitch</a>
        <a rel="me noopener" href="https://www.youtube.com/@kn_iidx" target="_blank"><img src="https://cdn.simpleicons.org/youtube/666" alt="" width="14" height="14">YouTube</a>
      </div>
    </nav>
  </aside>
  <!-- /component:sidebar -->`;
}

module.exports = { renderSidebar };
