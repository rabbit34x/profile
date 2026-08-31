(() => {
  document.querySelectorAll(".sidebar").forEach((sidebar) => {
    const button = sidebar.querySelector(".menu-toggle");
    const nav = sidebar.querySelector("nav");

    if (!button || !nav) return;

    const closeMenu = () => {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "メニューを開く");
      nav.classList.remove("is-open");
    };

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      button.setAttribute("aria-label", isOpen ? "メニューを開く" : "メニューを閉じる");
      nav.classList.toggle("is-open", !isOpen);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  });

  const updated = new Date(document.lastModified);

  if (Number.isNaN(updated.getTime())) return;

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(updated).map(({ type, value }) => [type, value]),
  );
  const label = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} JST`;

  document.querySelectorAll("[data-last-updated]").forEach((element) => {
    element.dateTime = updated.toISOString();
    element.textContent = label;
  });

  const commit = window.SITE_META?.commit;
  if (!/^[0-9a-f]{40}$/i.test(commit)) return;

  document.querySelectorAll("[data-commit]").forEach((element) => {
    element.href = `https://github.com/rabbit34x/profile/commit/${commit}`;
    element.textContent = commit.slice(0, 7);
  });
})();
