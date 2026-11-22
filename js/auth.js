window.LabourAuth = (() => {
  function icon(name) {
    const icons = {book:"LB", moon:"◐", sun:"☀", menu:"☰", logout:"↪"};
    return icons[name] || "";
  }

  function renderAuth() {
    document.documentElement.removeAttribute("data-theme");
    const savedTheme = localStorage.getItem("labour_theme");
    if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";
    document.getElementById("app").innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <div class="brand"><span class="brand-mark">${icon("book")}</span><span>Labour Book</span></div>
          <h1 id="authTitle">Welcome back</h1>
          <p class="muted" id="authSubtitle">Sign in to manage your labour operations.</p>
          <form id="authForm" class="form-grid">
            <div class="field register-only" style="display:none"><label for="fullName">Full name</label><input id="fullName" autocomplete="name"></div>
            <div class="field"><label for="email">Email address</label><input id="email" type="email" required autocomplete="email"></div>
            <div class="field"><label for="password">Password</label><input id="password" type="password" minlength="6" required autocomplete="current-password"></div>
            <button id="authSubmit" class="btn btn-primary btn-block" type="submit">Sign in</button>
          </form>
          <div class="auth-switch"><span id="switchText">New here?</span> <button id="authSwitch" class="text-btn" type="button">Create account</button></div>
        </section>
      </main>`;

    let registering = false;
    document.getElementById("authSwitch").addEventListener("click", () => {
      registering = !registering;
      document.querySelectorAll(".register-only").forEach(el => el.style.display = registering ? "grid" : "none");
      document.getElementById("authTitle").textContent = registering ? "Create account" : "Welcome back";
      document.getElementById("authSubtitle").textContent = registering ? "Create a secure account for your business." : "Sign in to manage your labour operations.";
      document.getElementById("authSubmit").textContent = registering ? "Create account" : "Sign in";
      document.getElementById("password").autocomplete = registering ? "new-password" : "current-password";
      document.getElementById("switchText").textContent = registering ? "Already have an account?" : "New here?";
      document.getElementById("authSwitch").textContent = registering ? "Sign in" : "Create account";
    });
    document.getElementById("authForm").addEventListener("submit", async event => {
      event.preventDefault();
      if (!LabourDB.keyIsConfigured()) {
        window.LabourApp.toast("Add your Supabase publishable key to js/config.js.", "error");
        return;
      }
      const db = await LabourDB.ensureReady();
      const button = document.getElementById("authSubmit");
      button.disabled = true;
      try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        if (registering) {
          const fullName = document.getElementById("fullName").value.trim();
          if (!fullName) throw new Error("Full name is required.");
          const { error } = await db.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
          });
          if (error) throw error;
          window.LabourApp.toast("Account created. Check your email if confirmation is enabled.", "success");
        } else {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (error) {
        window.LabourApp.toast(error.message || "Authentication failed.", "error");
      } finally {
        button.disabled = false;
      }
    });
  }

  return { renderAuth, icon };
})();
