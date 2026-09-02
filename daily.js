(() => {
  const selector = document.querySelector("[data-year-selector]");
  if (!selector) return;

  const showYear = (year) => {
    document.querySelectorAll("[data-log-year]").forEach((panel) => {
      panel.hidden = panel.dataset.logYear !== year;
    });
  };

  selector.addEventListener("change", () => showYear(selector.value));
  showYear(selector.value);
})();
