(function () {
  "use strict";

  const cfg = window.NEXAMPAY_CONFIG || {};
  const API_BASE_URL = String(cfg.API_BASE_URL || "https://nexampay-backend.onrender.com/api/v1").replace(/\/$/, "");
  const REQUEST_TIMEOUT = Number(cfg.REQUEST_TIMEOUT || 15000);
  const APP_VERSION = String(cfg.APP_VERSION || "1.0.0");
  const tg = window.Telegram?.WebApp || null;
  const nativeFetch = window.fetch.bind(window);

  const storage = {
    token: "nexampay_session_token",
    language: "nexampay_language",
    currency: "nexampay_currency",
    color: "nexampay_color",
    theme: "nexampay_theme",
  };

  const translations = {
    "Accueil": "Home",
    "Dépôt": "Deposit",
    "Retrait": "Withdraw",
    "Envoyer": "Send",
    "Transfert": "Transfer",
    "Boutique": "Shop",
    "Paramètres": "Settings",
    "Solde disponible": "Available balance",
    "Transactions récentes": "Recent transactions",
    "Aucune transaction récente": "No recent transactions",
    "Ajouter de l'argent": "Add money",
    "Transférer de l'argent": "Transfer money",
    "Créer votre compte": "Create your account",
    "Bienvenue sur NexamPay": "Welcome to NexamPay",
    "Votre profil": "Your profile",
    "Sécurisez votre compte": "Secure your account",
    "Votre compte est prêt": "Your account is ready",
    "Créer mon compte": "Create my account",
    "Continuer": "Continue",
    "Retour": "Back",
    "Sélectionner votre pays": "Select your country",
    "Sélectionner un pays": "Select a country",
    "PAYS DISPONIBLES": "AVAILABLE COUNTRIES",
    "Chargement des pays…": "Loading countries…",
    "Aucun pays disponible pour le moment.": "No countries are available right now.",
    "Numéro de téléphone": "Phone number",
    "Votre numéro de téléphone": "Your phone number",
    "PIN à 4 chiffres": "4-digit PIN",
    "Confirmer le PIN": "Confirm PIN",
    "Confirmer": "Confirm",
    "Confirmer le dépôt": "Confirm deposit",
    "Confirmer le retrait": "Confirm withdrawal",
    "Version NexamPay": "NexamPay Version",
    "NexamPay · Version": "NexamPay · Version",
    "Développeur": "Developer",
    "Français": "French",
    "Anglais": "English",
    "Sombre": "Dark",
    "Clair": "Light",
    "Vert": "Green",
    "Blanc": "White",
    "Noir": "Black",
    "Rose": "Pink",
    "Déconnexion": "Log out",
    "Support": "Support",
    "FAQ / Questions": "FAQ / Questions",
    "Canal d'annonces": "Announcements channel",
  };

  function getToken() {
    return String(localStorage.getItem(storage.token) || "").trim();
  }

  function setToken(token) {
    if (token) localStorage.setItem(storage.token, token);
    else localStorage.removeItem(storage.token);
  }

  function clearToken() { setToken(""); }

  function initTelegram() {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#050505");
      tg.setBackgroundColor("#050505");
      tg.disableVerticalSwipes?.();
    } catch (_) {}
  }

  function getInitData() { return String(tg?.initData || ""); }

  function authHeaders(existing, forAuth) {
    const headers = new Headers(existing || {});
    headers.set("Accept", "application/json");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const token = getToken();
    const initData = getInitData();

    if (forAuth || !token) {
      if (initData) {
        headers.set("Authorization", `Telegram ${initData}`);
        headers.set("X-Telegram-Init-Data", initData);
      }
    } else {
      headers.set("Authorization", `Bearer ${token}`);
      if (initData) headers.set("X-Telegram-Init-Data", initData);
    }
    return headers;
  }

  function absoluteApiUrl(input) {
    const original = typeof input === "string" ? input : input?.url || "";
    let url;
    try { url = new URL(original, window.location.href); }
    catch (_) { return original; }

    const fastApiCompat = {
      "/wallet/withdraw": "/withdrawal",
      "/wallet/deposit": "/deposits",
      "/wallet/transfer": "/transfer",
    };

    if (url.pathname.startsWith("/api/v1/")) {
      const apiPath = url.pathname.slice("/api/v1".length);
      const mapped = fastApiCompat[apiPath] || apiPath;
      return API_BASE_URL + mapped + url.search;
    }

    if (fastApiCompat[url.pathname]) {
      return API_BASE_URL + fastApiCompat[url.pathname] + url.search;
    }

    const legacyMap = {
      "/api/countries/deposit": "/countries",
      "/api/countries/withdraw": "/countries",
      "/api/countries": "/countries",
      "/api/networks": "/__aggregate_networks",
      "/api/currencies": "/__currencies",
      "/api/user/profile": "/profile",
      "/api/user/settings": "/__settings",
      "/api/auth/logout": "/auth/logout",
      "/api/wallet/balance": "/wallet",
      "/api/wallet/deposit": "/deposits",
      "/api/wallet/withdraw": "/withdrawal",
      "/api/wallet/transfer": "/transfer",
      "/api/shop/products": "/shop/products",
      "/api/shop/orders": "/shop/orders",
    };

    if (legacyMap[url.pathname]) {
      const target = legacyMap[url.pathname];
      if (target.startsWith("/__")) return target;
      return API_BASE_URL + target + url.search;
    }

    return original;
  }

  function svgData(label, bg = "#191919", fg = "#ffffff") {
    const safe = String(label || "NP").slice(0, 4).replace(/[<>&'\"]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${bg}"/><text x="48" y="57" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${fg}">${safe}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function flagEmoji(code) {
    const c = String(code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(c)) return "";
    return c.split("").map(x => String.fromCodePoint(127397 + x.charCodeAt(0))).join("");
  }

  function firstValue(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  }

  function normalizeCountry(country) {
    const c = { ...(country || {}) };
    c.name = firstValue(c, ["name", "label", "country_name"]) || "Pays";
    c.currency_code = firstValue(c, ["currency_code", "currency"]) || "FCFA";
    c.code = firstValue(c, ["code", "country_code", "iso_code"]) || "";
    c.flag_code = firstValue(c, ["flag_code", "iso_code", "code"]) || "";
    c.logo = firstValue(c, ["logo", "logo_url", "flag_url", "flag", "image_url", "image", "icon_url", "icon", "photo_url"]);
    if (!c.logo) c.logo = svgData(flagEmoji(c.flag_code) || c.code || "NP", "#191919", "#fff");
    return c;
  }

  function normalizeNetwork(network) {
    const n = { ...(network || {}) };
    n.name = firstValue(n, ["name", "label", "network_name", "provider_name", "title"]) || "Réseau";
    n.logo = firstValue(n, ["logo", "logo_url", "image_url", "image", "icon_url", "icon", "photo_url", "photo"]);
    if (!n.logo) {
      const initials = n.name.split(/\s+/).map(x => x[0]).join("").slice(0, 4).toUpperCase() || "MM";
      n.logo = svgData(initials, "#1a1a1a", "#e50914");
    }
    return n;
  }

  async function fetchNetworksForCountry(country, headers) {
    if (!country?.id) return [];
    try {
      const r = await nativeFetch(`${API_BASE_URL}/mobile-money/networks/${encodeURIComponent(country.id)}`, { headers });
      if (!r.ok) return [];
      const d = await r.json().catch(() => ({}));
      const items = Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : Array.isArray(d.networks) ? d.networks : []);
      return items.map(normalizeNetwork);
    } catch (_) { return []; }
  }

  async function decorateCountriesResponse(response, headers) {
    if (!response.ok) return response;
    const data = await response.clone().json().catch(() => null);
    if (!data) return response;
    const raw = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : Array.isArray(data.countries) ? data.countries : []);
    const countries = raw.map(normalizeCountry);
    const enriched = await Promise.all(countries.map(async c => ({ ...c, networks: await fetchNetworksForCountry(c, headers) })));
    const out = Array.isArray(data) ? enriched : { ...data, items: enriched, countries: enriched };
    return new Response(JSON.stringify(out), {
      status: response.status,
      statusText: response.statusText,
      headers: { "Content-Type": "application/json" }
    });
  }

  async function buildCurrencyResponse(headers) {
    try {
      const r = await nativeFetch(`${API_BASE_URL}/countries`, { headers });
      const d = await r.json().catch(() => ({}));
      const raw = Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []);
      const codes = [...new Set(raw.map(normalizeCountry).map(c => c.currency_code).filter(Boolean))];
      return new Response(JSON.stringify({ currencies: codes.map(code => ({ code })) }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (_) {
      return new Response(JSON.stringify({ currencies: ["FCFA", "XAF", "XOF", "CDF", "USD", "EUR"] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  async function buildNetworkAggregate(headers) {
    try {
      const r = await nativeFetch(`${API_BASE_URL}/countries`, { headers });
      const d = await r.json().catch(() => ({}));
      const raw = Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []);
      const countries = raw.map(normalizeCountry);
      const groups = await Promise.all(countries.map(c => fetchNetworksForCountry(c, headers)));
      const map = new Map();
      groups.flat().forEach(n => { if (n.id !== undefined) map.set(String(n.id), n); else map.set(n.name, n); });
      return new Response(JSON.stringify({ networks: [...map.values()] }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (_) {
      return new Response(JSON.stringify({ networks: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  window.fetch = async function patchedFetch(input, init) {
    let originalUrl = typeof input === "string" ? input : input?.url || "";
    let url = absoluteApiUrl(originalUrl);

    if (url === "/__currencies") return buildCurrencyResponse(authHeaders(init?.headers));
    if (url === "/__aggregate_networks") return buildNetworkAggregate(authHeaders(init?.headers));
    if (url === "/__settings") return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    const isAuthRequest = /\/auth\/telegram(?:\/create-account)?$/.test(url);
    const headers = authHeaders(init?.headers, isAuthRequest);

    let finalInit = { ...(init || {}), headers };

    const shouldUseMappedUrl = typeof url === "string" && (
      url.startsWith(API_BASE_URL) ||
      url.startsWith("/api/v1/") ||
      url.startsWith("/api/")
    );

    if (shouldUseMappedUrl) input = url;

    let response = await nativeFetch(input, finalInit);

    // Legacy wallet-balance compatibility: expose both root and nested shapes.
    if (response.ok && /\/api\/wallet\/balance(?:\?|$)/.test(originalUrl)) {
      const data = await response.clone().json().catch(() => ({}));
      const w = data?.wallet || data || {};
      response = new Response(JSON.stringify({
        ...data,
        balance: data?.balance ?? w?.balance ?? 0,
        currency: data?.currency ?? w?.currency ?? w?.currency_code ?? "FCFA",
        currency_code: data?.currency_code ?? w?.currency_code ?? w?.currency ?? "FCFA",
        wallet: {
          ...(data?.wallet || {}),
          balance: w?.balance ?? 0,
          currency: w?.currency ?? w?.currency_code ?? "FCFA",
          currency_code: w?.currency_code ?? w?.currency ?? "FCFA"
        }
      }), { status: response.status, statusText: response.statusText, headers: {"Content-Type":"application/json"} });
    }

    if (response.ok && /\/countries(?:\?|$)/.test(url)) {
      response = await decorateCountriesResponse(response, headers);
    }

    return response;
  };

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const url = path.startsWith("http") ? path : API_BASE_URL + (path.startsWith("/") ? path : "/" + path);
      const response = await nativeFetch(url, {
        ...options,
        headers: authHeaders(options.headers, /\/auth\/telegram/.test(url)),
        signal: controller.signal,
      });
      const data = response.status === 204 ? null : await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.detail || data?.message || data?.error || `Erreur serveur (${response.status})`;
        if (response.status === 401) clearToken();
        throw new Error(message);
      }
      if (data?.session_token) setToken(data.session_token);
      return data;
    } catch (e) {
      if (e?.name === "AbortError") throw new Error("Le serveur met trop de temps à répondre.");
      throw e;
    } finally { clearTimeout(timeout); }
  }

  async function authenticate() {
    const initData = getInitData();
    if (!initData) throw new Error("NexamPay doit être ouvert depuis Telegram.");
    const result = await request("/auth/telegram", { method: "POST", body: JSON.stringify({ init_data: initData }) });
    if (result?.is_new_user === true) clearToken();
    if (result?.session_token) setToken(result.session_token);
    return result;
  }

  async function getProfile() { return request("/profile"); }
  async function getWallet() { return request("/wallet"); }
  async function getCountries() {
    const data = await request("/countries");
    const raw = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : Array.isArray(data?.countries) ? data.countries : []);
    return raw.map(normalizeCountry);
  }
  async function getNetworks(countryId) {
    if (!countryId) return [];
    const data = await request(`/mobile-money/networks/${encodeURIComponent(countryId)}`);
    const raw = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : Array.isArray(data?.networks) ? data.networks : []);
    return raw.map(normalizeNetwork);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(String(text)); return true; }
    catch (_) {
      try { const t=document.createElement("textarea"); t.value=String(text); t.style.position="fixed"; t.style.opacity="0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); return true; } catch (__) { return false; }
    }
  }

  function pref(name, fallback) { return localStorage.getItem(storage[name]) || fallback; }
  function settings() {
    return { language: pref("language", "fr"), currency: pref("currency", "FCFA"), color: pref("color", "nexam"), theme: pref("theme", "dark") };
  }

  const colors = { nexam: "#e50914", green: "#16a765", white: "#f0f0f0", black: "#111111", pink: "#ed3b8d" };
  function applyPreferences() {
    const s = settings();
    const accent = colors[s.color] || colors.nexam;
    const root = document.documentElement;
    root.dataset.npTheme = s.theme;
    root.dataset.npColor = s.color;
    root.lang = s.language;
    const vars = {
      "--red": accent, "--red2": accent, "--primary": accent, "--accent": accent,
      "--np-red": accent, "--np-red-light": accent,
      "--np-bg": s.theme === "light" ? "#f5f5f7" : "#080808",
      "--np-black": s.theme === "light" ? "#f5f5f7" : "#050505",
      "--np-card": s.theme === "light" ? "#ffffff" : "#111111",
      "--np-card-2": s.theme === "light" ? "#f0f0f2" : "#171717",
      "--bg": s.theme === "light" ? "#f5f5f7" : "#070707",
      "--card": s.theme === "light" ? "#ffffff" : "#111111",
      "--card2": s.theme === "light" ? "#f0f0f2" : "#171717",
      "--text": s.theme === "light" ? "#111111" : "#f5f5f5",
      "--np-text": s.theme === "light" ? "#111111" : "#f5f5f5",
      "--muted": s.theme === "light" ? "#707070" : "#929292",
      "--np-muted": s.theme === "light" ? "#707070" : "#929292",
      "--border": s.theme === "light" ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.08)",
      "--np-border": s.theme === "light" ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.08)"
    };
    Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k, v));
    root.dataset.nexamPayVersion = APP_VERSION;
  }

  function bindPreferenceLiveUpdates() {
    const bind = (selector, key) => {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener("click", () => {
          setTimeout(() => {
            applyPreferences();
            translateDom();
          }, 0);
        });
      });
    };
    bind("[data-lang]", "language");
    bind("[data-color]", "color");
    bind("[data-theme]", "theme");
    bind("[data-currency]", "currency");
  }

  function translateDom() {
    const s = settings();
    if (s.language !== "en") return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes=[];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const original=node.nodeValue.trim();
      if (!original || original.length>80) return;
      const translated=translations[original];
      if (translated) node.nodeValue=node.nodeValue.replace(original, translated);
    });
  }

  function setVersion() {
    document.querySelectorAll("#versionTrigger, .version, [data-nexampay-version]").forEach(el => {
      el.textContent = `NexamPay · Version ${APP_VERSION}`;
    });
  }

  function attachCopyNumber(profile) {
    const id = profile?.nexampay_id || "";
    if (!id) return;
    const host = document.getElementById("headerTelegramNumber");
    if (!host) return;
    host.dataset.nexamNumber = id;
    host.title = "Copier le NexamPay Number";
    host.style.cursor = "pointer";
    host.textContent = id;
    host.onclick = async () => {
      if (await copy(id)) {
        const original = host.textContent;
        host.textContent = "Copié ✓";
        setTimeout(() => host.textContent = original, 1200);
      }
    };
    let badge = document.getElementById("headerNexamId");
    if (!badge) {
      badge = document.createElement("button");
      badge.id = "headerNexamId";
      badge.type = "button";
      badge.className = "np-header-nexam-copy";
      host.insertAdjacentElement("afterend", badge);
    }
    badge.textContent = `NexamPay · ${id}`;
    badge.onclick = async () => {
      if (await copy(id)) {
        const old=badge.textContent; badge.textContent="NexamPay · Copié ✓"; setTimeout(()=>badge.textContent=old,1200);
      }
    };
  }

  function globalStyle() {
    if (document.getElementById("nexampayCoreStyle")) return;
    const style=document.createElement("style"); style.id="nexampayCoreStyle";
    style.textContent=`
      body[data-np-theme="light"],html[data-np-theme="light"] body{background-color:#f5f5f7 !important;color:#111 !important}
      body[data-np-theme="dark"],html[data-np-theme="dark"] body{background-color:#070707 !important}
      .np-header-nexam-copy{display:block;width:100%;padding:0;background:transparent;border:0;color:var(--red,#e50914);font-size:9px;font-weight:800;text-align:left;margin-top:3px;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function init() {
    initTelegram();
    globalStyle();
    applyPreferences();
    setVersion();
    translateDom();
    bindPreferenceLiveUpdates();
  }

  window.NexamPayCore = {
    API_BASE_URL, APP_VERSION, tg, getToken, setToken, clearToken, getInitData,
    request, authenticate, getProfile, getWallet, getCountries, getNetworks, copy,
    normalizeCountry, normalizeNetwork, firstValue, flagEmoji, settings, applyPreferences,
    setVersion, attachCopyNumber, translateDom, translations
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
