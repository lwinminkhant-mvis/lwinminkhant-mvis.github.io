window.LabourDB = (() => {
  const cfg = window.APP_CONFIG;
  let client = null;

  function keyIsConfigured() {
    return cfg.SUPABASE_PUBLISHABLE_KEY &&
      !cfg.SUPABASE_PUBLISHABLE_KEY.startsWith("YOUR_");
  }

  function init() {
    if (!keyIsConfigured()) {
      return null;
    }
    if (!window.supabase) {
      throw new Error("Supabase CDN failed to load.");
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
    return client;
  }

  client = init();

  return {
    get client() { return client; },
    keyIsConfigured,
    async ensureReady() {
      if (!keyIsConfigured()) throw new Error("Add your Supabase publishable key to js/config.js.");
      if (!client) throw new Error("Supabase is not initialized.");
      return client;
    },
    async currentUser() {
      const db = await this.ensureReady();
      const { data, error } = await db.auth.getUser();
      if (error) throw error;
      return data.user || null;
    },
    async session() {
      const db = await this.ensureReady();
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      return data.session;
    }
  };
})();
