(function () {
  const header = document.getElementById("header");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const contactForm = document.getElementById("contactForm");
  const contactSubmitBtn = document.getElementById("contactSubmitBtn");
  const inlineFormError = document.getElementById("inlineFormError");
  const inlineFormErrorText = document.getElementById("inlineFormErrorText");
  const inlineFormSuccess = document.getElementById("inlineFormSuccess");

  const apiUrl = window.FREEDOMDESK_CONFIG?.apiUrl || "/api/leads";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fieldLabels = {
    fullName: "Full name",
    practiceName: "Practice name",
    email: "Work email",
    phone: "Phone number",
    practiceSoftware: "Practice management software",
    callVolume: "Estimated monthly call volume",
  };

  window.addEventListener(
    "scroll",
    () => header?.classList.toggle("scrolled", window.scrollY > 8),
    { passive: true }
  );

  navToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open);
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.dataset.revealDelay || "0", 10);
          setTimeout(() => el.classList.add("revealed"), delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => observer.observe(el));
  }

  function clearFieldErrors(form) {
    form?.querySelectorAll(".form-row.is-invalid").forEach((row) => {
      row.classList.remove("is-invalid");
      row.querySelector(".form-row-error")?.remove();
    });
    if (inlineFormError) inlineFormError.hidden = true;
  }

  function showFieldError(form, name, message) {
    const input = form?.elements[name];
    if (!input) return;
    const row = input.closest(".form-row");
    if (!row) return;
    row.classList.add("is-invalid");
    if (!row.querySelector(".form-row-error")) {
      const err = document.createElement("span");
      err.className = "form-row-error";
      err.textContent = message;
      row.appendChild(err);
    }
  }

  function validateForm(formData) {
    clearFieldErrors(contactForm);
    const errors = {};
    const data = Object.fromEntries(formData.entries());

    Object.keys(fieldLabels).forEach((key) => {
      if (!data[key]?.trim()) errors[key] = "This field is required.";
    });

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    const phoneDigits = (data.phone || "").replace(/\D/g, "");
    if (data.phone && phoneDigits.length < 10) {
      errors.phone = "Enter a valid phone number.";
    }

    Object.entries(errors).forEach(([key, msg]) => showFieldError(contactForm, key, msg));
    return { valid: Object.keys(errors).length === 0, data, errors };
  }

  function formatPhoneInput(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async function submitLead(data) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "website" }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(payload.error || "Unable to submit your request.");
      err.status = res.status;
      err.errors = payload.errors;
      throw err;
    }

    return payload;
  }

  document.getElementById("phone")?.addEventListener("input", (e) => {
    e.target.value = formatPhoneInput(e.target.value);
  });

  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { valid, data } = validateForm(new FormData(contactForm));
    if (!valid) {
      const firstInvalid = contactForm.querySelector(".form-row.is-invalid input, .form-row.is-invalid select");
      firstInvalid?.focus();
      return;
    }

    contactSubmitBtn?.classList.add("is-loading");
    contactSubmitBtn.disabled = true;
    if (inlineFormSuccess) inlineFormSuccess.hidden = true;

    try {
      await submitLead(data);
      contactForm.reset();
      clearFieldErrors(contactForm);
      if (inlineFormSuccess) {
        inlineFormSuccess.hidden = false;
        inlineFormSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([key, msg]) => showFieldError(contactForm, key, msg));
      }

      if (inlineFormError && inlineFormErrorText) {
        inlineFormErrorText.textContent =
          err.status === 503
            ? "Our system is temporarily unavailable. Please try again shortly."
            : err.message || "Something went wrong. Please try again.";
        inlineFormError.hidden = false;
        inlineFormError.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } finally {
      contactSubmitBtn?.classList.remove("is-loading");
      contactSubmitBtn.disabled = false;
    }
  });

  initReveal();
})();
