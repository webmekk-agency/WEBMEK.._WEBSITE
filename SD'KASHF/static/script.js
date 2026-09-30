const API = "/api";

// ==========================================
// CHANGE THESE TWO VALUES FOR YOUR BUSINESS
// ==========================================
const CONFIG = {
  whatsappNumber: "916351199175",
  businessName: "WebMek"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const applyModal = $("#applyModal");
const loginModal = $("#loginModal");
const selectedPlan = $("#selectedPlan");
const formStatus = $("#formStatus");

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeAllModals() {
  $$(".modal").forEach(modal => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
}

$$('[data-open-apply]').forEach(button => {
  button.addEventListener("click", () => openModal(applyModal));
});

$$('[data-open-login]').forEach(button => {
  button.addEventListener("click", () => openModal(loginModal));
});

$$('[data-close-modal]').forEach(element => {
  element.addEventListener("click", closeAllModals);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllModals();
});

$$('[data-plan]').forEach(button => {
  button.addEventListener("click", () => {
    selectedPlan.value = button.dataset.plan || "";
    openModal(applyModal);
  });
});

const mobileMenuBtn = $(".mobile-menu");
const mobileNav = $(".mobile-nav");

if (mobileMenuBtn && mobileNav) {

  mobileMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    mobileNav.hidden = !mobileNav.hidden;
  });

  // Menu link click → close menu
  mobileNav.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => {
      mobileNav.hidden = true;
    });
  });

  // Outside click → close menu
  document.addEventListener("click", (event) => {
    if (
      !mobileNav.contains(event.target) &&
      !mobileMenuBtn.contains(event.target)
    ) {
      mobileNav.hidden = true;
    }
  });
}

window.addEventListener("mousemove", (event) => {
  const glow = $(".cursor-glow");
  if (!glow) return;
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.1 });

$$(".reveal").forEach(element => observer.observe(element));

function createWhatsAppUrl(message) {
  if (!/^\d{10,15}$/.test(CONFIG.whatsappNumber)) return null;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildWhatsAppMessage(data, leadId = "Pending") {
  return [
    "🔔 NEW WEBMEK LEAD",
    "",
    `Lead ID: ${leadId}`,
    `Name: ${data.name}`,
    `Business: ${data.business}`,
    `WhatsApp: ${data.phone}`,
    `City: ${data.city}`,
    `Business Type: ${data.businessType}`,
    `Budget: ${data.budget}`,
    `Selected Plan: ${data.selectedPlan || "Not selected"}`,
    "",
    `Requirement: ${data.requirement}`,
    "",
    `Source: ${CONFIG.businessName} Website`
  ].join("\n");
}

const applyForm = $("#applyForm");
applyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#submitLeadBtn");
  button.disabled = true;
  button.textContent = "Submitting...";
  formStatus.textContent = "Saving your enquiry...";

  const data = Object.fromEntries(new FormData(applyForm).entries());
  let responseData = null;

  try {
    const response = await fetch(`${API}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error || "Unable to save enquiry");

    formStatus.textContent = `Application saved: ${responseData.lead_id}`;
  } catch (error) {
    formStatus.textContent = `Backend unavailable. Opening WhatsApp directly. ${error.message}`;
  }

  const message = buildWhatsAppMessage(
    data,
    responseData?.lead_id || "Web form"
  );
  const whatsappUrl = createWhatsAppUrl(message);

  if (whatsappUrl) {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  } else {
    formStatus.textContent += " Add your WhatsApp number in static/script.js.";
  }

  button.disabled = false;
  button.textContent = "Submit & Open WhatsApp ↗";
});

const whatsappLink = $("[data-whatsapp-link]");
if (whatsappLink) {
  const url = createWhatsAppUrl("Hello WebMek, I want a website for my business.");
  if (url) whatsappLink.href = url;
  else whatsappLink.addEventListener("click", () => alert("Please add your WhatsApp number in static/script.js"));
}

const loginTab = $('[data-auth-tab="login"]');
const signupTab = $('[data-auth-tab="signup"]');
const loginForm = $("#loginForm");
const signupForm = $("#signupForm");

function switchAuth(tab) {
  const login = tab === "login";
  loginForm.hidden = !login;
  signupForm.hidden = login;
  loginTab.classList.toggle("active", login);
  signupTab.classList.toggle("active", !login);
}

loginTab?.addEventListener("click", () => switchAuth("login"));
signupTab?.addEventListener("click", () => switchAuth("signup"));

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#loginStatus");
  const data = Object.fromEntries(new FormData(loginForm).entries());
  status.textContent = "Logging in...";

  try {
    const response = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Login failed");
    window.location.href = result.user.role === "admin" ? "/admin" : "/client";
  } catch (error) {
    status.textContent = error.message;
  }
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#signupStatus");
  const data = Object.fromEntries(new FormData(signupForm).entries());
  status.textContent = "Creating account...";

  try {
    const response = await fetch(`${API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Signup failed");
    window.location.href = "/client";
  } catch (error) {
    status.textContent = error.message;
  }
});

/* =========================================
   WEBMEK LOGIN / SIGN UP SWITCH
   ========================================= */

document.querySelectorAll("[data-auth-tab]").forEach(function (button) {

  button.addEventListener("click", function () {

    const mode = button.getAttribute("data-auth-tab");

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const authTitle = document.getElementById("authTitle");
    const authDescription = document.getElementById("authDescription");

    /* Change active tab */

    document.querySelectorAll(".auth-tabs [data-auth-tab]").forEach(function (tab) {
      tab.classList.remove("active");
    });

    const activeTab = document.querySelector(
      '.auth-tabs [data-auth-tab="' + mode + '"]'
    );

    if (activeTab) {
      activeTab.classList.add("active");
    }


    /* LOGIN */

    if (mode === "login") {

      loginForm.hidden = false;
      signupForm.hidden = true;

      authTitle.innerHTML =
        'Welcome <span class="gradient-text">back.</span>';

      authDescription.textContent =
        "Login to continue to your WebMek client dashboard.";

    }


    /* SIGN UP */

    if (mode === "signup") {

      loginForm.hidden = true;
      signupForm.hidden = false;

      authTitle.innerHTML =
        'Create your <span class="gradient-text">account.</span>';

      authDescription.textContent =
        "Sign up to get started with your WebMek client dashboard.";

    }

  });

});