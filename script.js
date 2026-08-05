(function () {
  fetch('update_manifest.json', { cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data) return;
      document.querySelectorAll('[data-site-version]').forEach(function (element) {
        element.textContent = 'v' + (data.latest_version || '—') + (data.channel ? ' ' + data.channel : '');
      });
      document.querySelectorAll('[data-download-link]').forEach(function (element) {
        if (data.stable_download_url) {
          element.href = data.stable_download_url;
        } else if (data.download_url) {
          element.href = data.download_url;
        }
      });
    })
    .catch(function () {});

  try {
    const pending = localStorage.getItem('osm_pending_order');
    if (pending && document.getElementById('checkoutForm')) {
      const data = JSON.parse(pending);
      ['full_name', 'email', 'phone', 'plan', 'term', 'workshop', 'comment'].forEach(function (name) {
        const element = document.querySelector('[name="' + name + '"]');
        if (element && data[name] !== undefined) element.value = data[name];
      });
    }
  } catch (error) {
    // Відновлення чернетки замовлення не впливає на основну форму.
  }

  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('main-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('[data-plan]').forEach(function (link) {
    link.addEventListener('click', function () {
      try {
        localStorage.setItem('osm_selected_plan', link.getAttribute('data-plan') || '');
      } catch (error) {
        // Local storage is optional; ordering by email still works without it.
      }
    });
  });

  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    const catalog = {
      Basic: { 6: { uah: 450, usd: 10 }, 12: { uah: 675, usd: 15 } },
      Pro: { 6: { uah: 900, usd: 20 }, 12: { uah: 1350, usd: 30 } },
      Cloud: { 6: { uah: 1800, usd: 40 }, 12: { uah: 2700, usd: 60 } },
      Enterprise: { 12: { uah: 4500, usd: 100 } }
    };
    const planField = document.getElementById('plan');
    const termField = document.getElementById('term');
    const payButton = document.getElementById('liqpayCheckoutButton');
    const result = document.getElementById('orderResult');
    const liqpayStatus = document.getElementById('liqpayStatus');
    const params = new URLSearchParams(window.location.search);
    const requestedPlan = params.get('plan');
    const requestedTerm = params.get('term');
    let liqpayReady = false;

    if (requestedPlan && catalog[requestedPlan]) planField.value = requestedPlan;
    if (requestedTerm === '6' || requestedTerm === '12') termField.value = requestedTerm;

    try {
      const platformSession = JSON.parse(localStorage.getItem('online_platform_session') || '{}');
      const account = platformSession.account || {};
      const fullName = account.full_name || account.owner_name || '';
      const email = account.email || '';
      if (fullName && !checkoutForm.elements.full_name.value) checkoutForm.elements.full_name.value = fullName;
      if (email && !checkoutForm.elements.email.value) checkoutForm.elements.email.value = email;
    } catch (error) {
      // Автозаповнення не блокує оформлення.
    }

    function formatNumber(value) {
      return new Intl.NumberFormat('uk-UA').format(value);
    }

    function updateSummary() {
      const plan = planField.value;
      if (plan === 'Enterprise') {
        termField.value = '12';
        termField.querySelector('option[value="6"]').disabled = true;
      } else {
        termField.querySelector('option[value="6"]').disabled = false;
      }
      const term = termField.value;
      const price = catalog[plan][term] || catalog[plan][12];
      document.getElementById('summaryPlan').textContent = plan;
      document.getElementById('summaryTerm').textContent = term + ' місяців';
      document.getElementById('summaryUsd').textContent = (plan === 'Enterprise' ? 'від ' : '') + price.usd + ' USD';
      document.getElementById('summaryPrice').textContent = (plan === 'Enterprise' ? 'від ' : '') + formatNumber(price.uah) + ' грн';
    }

    function setResult(message, isError) {
      result.textContent = message;
      result.classList.add('is-visible');
      result.classList.toggle('is-error', Boolean(isError));
    }

    async function resolveApiBase() {
      const response = await fetch('config/api.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Не вдалося завантажити конфігурацію API');
      const config = await response.json();
      return String(config.api_url || '').replace(/\/$/, '');
    }

    async function checkLiqPay() {
      try {
        const apiBase = await resolveApiBase();
        const response = await fetch(apiBase + '/api/v1/payments/providers', { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const providers = await response.json();
        const liqpay = providers.find(function (item) { return item.code === 'LIQPAY'; });
        liqpayReady = Boolean(liqpay && liqpay.enabled && liqpay.configured);
      } catch (error) {
        liqpayReady = false;
      }

      if (liqpayReady) {
        payButton.disabled = false;
        payButton.textContent = 'Оплатити через LiqPay';
        liqpayStatus.textContent = 'Захищена оплата LiqPay готова.';
      } else {
        payButton.disabled = true;
        payButton.textContent = 'LiqPay ще не підключено';
        liqpayStatus.textContent = 'Онлайн-оплата буде доступна після підключення merchant-ключів LiqPay.';
      }
    }

    planField.addEventListener('change', updateSummary);
    termField.addEventListener('change', updateSummary);
    updateSummary();
    checkLiqPay();

    checkoutForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
      }
      if (!liqpayReady) {
        setResult('Оплата LiqPay ще не підключена. Замовлення не створювалося і не передавалося службі підтримки.', true);
        return;
      }

      const data = Object.fromEntries(new FormData(checkoutForm).entries());
      try { localStorage.setItem('osm_pending_order', JSON.stringify(data)); } catch (error) {}
      setResult('Переходимо до захищеної оплати LiqPay…', false);
      payButton.disabled = true;
      payButton.textContent = 'Створюємо платіж…';

      setResult('LiqPay готовий, але production-створення платіжної форми ще не реалізоване в Cloud API.', true);
      payButton.disabled = false;
      payButton.textContent = 'Оплатити через LiqPay';
    });
  }})();
