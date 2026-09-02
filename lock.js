/* 客户端密码门禁（防路人级；彻底私有需 GitHub Pro + 私有仓库） */
(function () {
  // 密码的 SHA-256 哈希（默认密码：kaogong2026，改密码只需替换此哈希）
  const PASS_HASH = "e2e1615feadfd6732335c4ae8b970afe1c9c3a13581869074a4059300d97b5c6";
  const KEY = "gktk_unlocked";

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  window.unlock = async function () {
    const v = document.getElementById("lockInput").value.trim();
    if (!v) return;
    if ((await sha256(v)) === PASS_HASH) {
      sessionStorage.setItem(KEY, "1");
      hide();
    } else {
      document.getElementById("lockErr").textContent = "密码不正确";
    }
  };

  function hide() { document.getElementById("lock").style.display = "none"; }

  if (sessionStorage.getItem(KEY) === "1") hide();
})();
