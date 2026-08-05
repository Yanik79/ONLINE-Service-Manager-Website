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
      Basic: { 6: { uah: 450, usd: 10, code: 'BASIC_6' }, 12: { uah: 675, usd: 15, code: 'BASIC_12' } },
      Pro: { 6: { uah: 900, usd: 20, code: 'PRO_6' }, 12: { uah: 1350, usd: 30, code: 'PRO_12' } },
      Cloud: { 6: { uah: 1800, usd: 40, code: 'CLOUD_6' }, 12: { uah: 2700, usd: 60, code: 'CLOUD_12' } },
      Enterprise: { 12: { uah: 4500, usd: 100, code: '' } }
    };
    const planField = document.getElementById('plan');
    const termField = document.getElementById('term');
    const payButton = document.getElementById('liqpayCheckoutButton');
    const result = document.getElementById('orderResult');
    const liqpayStatus = document.getElementById('liqpayStatus');
    const params = new URLSearchParams(window.location.search);
    const requestedPlan = params.get('plan');
    const requestedTerm = params.get('term');
    let paymentMode = '';
    let apiBase = '';

    if (requestedPlan && catalog[requestedPlan]) planField.value = requestedPlan;
    if (requestedTerm === '6' || requestedTerm === '12') termField.value = requestedTerm;

    try {
      const platformSession = JSON.parse(localStorage.getItem('online_platform_session') || '{}');
      const account = platformSession.account || {};
      const fullName = account.full_name || account.owner_name || '';
      const email = account.email || '';
      if (fullName && !checkoutForm.elements.full_name.value) checkoutForm.elements.full_name.value = fullName;
      if (email && !checkoutForm.elements.email.value) checkoutForm.elements.email.value = email;
    } catch (error) {}

    function token() {
      try { return localStorage.getItem('online_platform_token') || ''; }
      catch (error) { return ''; }
    }

    function authHeaders() {
      const value = token();
      return value
        ? { 'Authorization': 'Bearer ' + value, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
    }

    function formatNumber(value) {
      return new Intl.NumberFormat('uk-UA').format(value);
    }

    function selectedPrice() {
      const plan = planField.value;
      const term = termField.value;
      return catalog[plan][term] || catalog[plan][12];
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
      const price = selectedPrice();
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

    async function checkPaymentMode() {
      try {
        apiBase = await resolveApiBase();
        const response = await fetch(apiBase + '/api/v1/payments/providers', { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const providers = await response.json();
        const liqpay = providers.find(function (item) { return item.code === 'LIQPAY'; });
        const test = providers.find(function (item) { return item.code === 'TEST'; });

        if (liqpay && liqpay.enabled && liqpay.configured) {
          paymentMode = 'LIQPAY';
        } else if (test && test.enabled && test.configured) {
          paymentMode = 'TEST';
        } else {
          paymentMode = '';
        }
      } catch (error) {
        paymentMode = '';
      }

      if (paymentMode === 'LIQPAY') {
        payButton.disabled = false;
        payButton.textContent = 'Оплатити через LiqPay';
        liqpayStatus.textContent = 'Захищена оплата LiqPay готова.';
      } else if (paymentMode === 'TEST') {
        payButton.disabled = false;
        payButton.textContent = 'Провести тестову оплату';
        liqpayStatus.textContent = 'Увімкнено безпечний тестовий режим. Реальні кошти не списуються.';
      } else {
        payButton.disabled = true;
        payButton.textContent = 'LiqPay ще не підключено';
        liqpayStatus.textContent = 'Онлайн-оплата буде доступна після підключення merchant-ключів LiqPay.';
      }
    }

    async function apiJson(path, options) {
      const response = await fetch(apiBase + path, Object.assign({
        headers: authHeaders(),
        cache: 'no-store'
      }, options || {}));
      let data = {};
      try { data = await response.json(); } catch (error) {}
      if (!response.ok) {
        throw new Error(data.detail || data.message || ('Cloud API HTTP ' + response.status));
      }
      return data;
    }

    planField.addEventListener('change', updateSummary);
    termField.addEventListener('change', updateSummary);
    updateSummary();
    checkPaymentMode();

    checkoutForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
      }
      if (!token()) {
        setResult('Для оплати потрібно увійти до ONLINE Account.', true);
        return;
      }
      const price = selectedPrice();
      if (!price.code) {
        setResult('Для Enterprise потрібна індивідуальна пропозиція.', true);
        return;
      }

      const data = Object.fromEntries(new FormData(checkoutForm).entries());
      try { localStorage.setItem('osm_pending_order', JSON.stringify(data)); } catch (error) {}

      payButton.disabled = true;
      try {
        if (paymentMode === 'TEST') {
          payButton.textContent = 'Створюємо тестове замовлення…';
          setResult('Створюємо тестове платіжне замовлення. Реальні кошти не списуються.', false);

          const order = await apiJson('/api/v1/payments/orders', {
            method: 'POST',
            body: JSON.stringify({
              product_code: 'ONLINE_SM',
              plan_code: price.code,
              provider: 'TEST'
            })
          });

          payButton.textContent = 'Підтверджуємо тестову оплату…';
          const paid = await apiJson('/api/v1/payments/test/confirm/' + order.order_id, {
            method: 'POST',
            body: '{}'
          });

          try {
            localStorage.removeItem('osm_pending_order');
            localStorage.setItem('online_test_payment_result', JSON.stringify(paid));
          } catch (error) {}

          setResult('Тестову оплату підтверджено. Тариф активовано, переходимо до кабінету…', false);
          window.setTimeout(function () {
            location.href = 'account.html?payment=test-success';
          }, 900);
          return;
        }

        if (paymentMode === 'LIQPAY') {
          setResult('LiqPay підключено, але production-створення платіжної форми ще не реалізоване в Cloud API.', true);
          return;
        }

        setResult('Платіжний провайдер ще не підключено.', true);
      } catch (error) {
        setResult('Не вдалося провести тестову оплату: ' + error.message, true);
      } finally {
        payButton.disabled = false;
        if (paymentMode === 'TEST') payButton.textContent = 'Провести тестову оплату';
        else if (paymentMode === 'LIQPAY') payButton.textContent = 'Оплатити через LiqPay';
      }
    });
  }
})();
