/* =============================================
   FULL PROTEIN — Main JavaScript
   All page logic, cart, orders, reservations
   ============================================= */

const API_BASE = '/api';

// ===== APP STATE =====
const App = {
  cart: [],
  menuItems: [],
  currentPage: 'home',
  token: localStorage.getItem('fp_token'),

  init() {
    this.loadMenu();
    this.setupNavigation();
    this.setupCartDrawer();
    this.setupMenuTabs();
    this.setupReservationForm();
    this.setupContactForm();
    this.setupOrderFlow();
    this.setupHomeFeatured();
    this.setupGallery();
    this.setMobileMenu();
    this.loadCart();
    this.updateCartUI();
  },

  // ===== API HELPERS =====
  async api(path, options = {}) {
    try {
      const res = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API Error:', err);
      return { success: false, message: err.message };
    }
  },

  // ===== TOAST NOTIFICATIONS =====
  toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  // ===== LOAD MENU =====
  async loadMenu() {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success) {
        this.menuItems = data.data;
        this.renderMenu('all');
        this.renderOrderMenu('all');
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    }
  },

  // ===== NAVIGATION =====
  setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const page = el.dataset.page;
        this.navigateTo(page);
      });
    });
  },

  navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));
    this.currentPage = page;
    // Close mobile nav
    document.getElementById('nav').classList.remove('open');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ===== MOBILE MENU =====
  setMobileMenu() {
    document.getElementById('hamburger').addEventListener('click', () => {
      document.getElementById('nav').classList.toggle('open');
    });
  },

  // ===== CART DRAWER =====
  setupCartDrawer() {
    const cartBtn = document.getElementById('cartBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartClose = document.getElementById('cartClose');

    cartBtn.addEventListener('click', () => this.openCart());
    cartClose.addEventListener('click', () => this.closeCart());
    cartOverlay.addEventListener('click', () => this.closeCart());
  },

  openCart() {
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartDrawer').classList.add('open');
    this.renderCartItems();
  },

  closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartDrawer').classList.remove('open');
    // Reset checkout view
    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('cartBody').style.display = 'block';
    document.getElementById('cartFooter').style.display = 'block';
  },

  // ===== CART LOGIC =====
  addToCart(item) {
    const existing = this.cart.find(i => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({ ...item, qty: 1 });
    }
    this.saveCart();
    this.updateCartUI();
    this.toast(`${item.name} added to cart`, 'info');
    // Update mini cart if on order page
    this.renderMiniCart();
  },

  removeFromCart(id) {
    this.cart = this.cart.filter(i => i.id !== id);
    this.saveCart();
    this.updateCartUI();
    this.renderCartItems();
    this.renderMiniCart();
  },

  updateQty(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.removeFromCart(id);
      return;
    }
    this.saveCart();
    this.updateCartUI();
    this.renderCartItems();
    this.renderMiniCart();
  },

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  },

  saveCart() {
    localStorage.setItem('fp_cart', JSON.stringify(this.cart));
  },

  loadCart() {
    try {
      const saved = localStorage.getItem('fp_cart');
      if (saved) this.cart = JSON.parse(saved);
    } catch (e) { this.cart = []; }
  },

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.updateCartUI();
    this.renderCartItems();
    this.renderMiniCart();
  },

  updateCartUI() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = this.getCartCount();
  },

  renderCartItems() {
    const container = document.getElementById('cartItems');
    const empty = document.querySelector('.cart-empty');
    const footer = document.getElementById('cartFooter');

    if (this.cart.length === 0) {
      if (empty) empty.style.display = 'block';
      container.innerHTML = '';
      if (footer) footer.style.display = 'none';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (footer) footer.style.display = 'block';

    container.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <img src="/uploads/${item.image}" class="cart-item-img" alt="${item.name}" onerror="this.src='/images/hero-1.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${(item.price * item.qty).toFixed(2)} SAR</div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="App.updateQty(${item.id}, -1)"><i class="fas fa-minus"></i></button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" onclick="App.updateQty(${item.id}, 1)"><i class="fas fa-plus"></i></button>
            <button class="cart-item-remove" onclick="App.removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    // Update totals
    this.updateCartTotals();
  },

  updateCartTotals() {
    const subtotal = this.getCartTotal();
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    const subEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');

    if (subEl) subEl.textContent = `${subtotal.toFixed(2)} SAR`;
    if (taxEl) taxEl.textContent = `${tax.toFixed(2)} SAR`;
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} SAR`;
  },

  renderMiniCart() {
    const container = document.getElementById('orderMiniItems');
    const totalContainer = document.getElementById('orderMiniTotal');
    const totalVal = document.getElementById('orderMiniTotalVal');

    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = '<p class="cart-empty-text">Cart is empty</p>';
      if (totalContainer) totalContainer.style.display = 'none';
      return;
    }

    container.innerHTML = this.cart.map(item => `
      <div class="order-mini-item">
        <div>
          <div class="order-mini-item-name">${item.name}</div>
          <div class="order-mini-item-qty">Qty: ${item.qty}</div>
        </div>
        <div class="order-mini-item-price">${(item.price * item.qty).toFixed(2)} SAR</div>
      </div>
    `).join('');

    if (totalContainer) totalContainer.style.display = 'block';
    if (totalVal) totalVal.textContent = `${this.getCartTotal().toFixed(2)} SAR`;
  },

  getImageIndex(item) {
    const idx = this.menuItems.findIndex(i => i.id === item.id);
    return (idx >= 0) ? (idx + 1) : 1;
  },

  // ===== HOME FEATURED =====
  async setupHomeFeatured() {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (!data.success) return;

      const items = data.data.filter(i => i.featured).slice(0, 6);
      const grid = document.getElementById('featuredGrid');
      if (!grid) return;

      grid.innerHTML = items.map(item => `
        <div class="food-card">
          <img src="/uploads/${item.image}" class="food-card-img" alt="${item.name}" onerror="this.src='/images/hero-1.jpg'">
          <div class="food-card-body">
            <h3 class="food-card-name">${item.name}</h3>
            <p class="food-card-desc">${item.description || ''}</p>
            <div class="food-card-footer">
              <span class="food-card-price">${item.price} SAR</span>
              <button class="btn btn-gold btn-sm" onclick="App.addToCart({id:${item.id}, name:'${item.name.replace(/'/g, "\\'")}', price:${item.price}})"><i class="fas fa-plus"></i> Add</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Featured load error:', err);
    }
  },

  // ===== MENU PAGE =====
  setupMenuTabs() {
    document.querySelectorAll('.menu-tab[data-category]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderMenu(tab.dataset.category);
      });
    });
  },

  renderMenu(category) {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    const items = category === 'all'
      ? this.menuItems
      : this.menuItems.filter(i => i.category === category);

    if (items.length === 0) {
      grid.innerHTML = '<div class="loader">No items in this category</div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="food-card">
        <img src="/uploads/${item.image}" class="food-card-img" alt="${item.name}" onerror="this.src='/images/hero-1.jpg'">
        <div class="food-card-body">
          <h3 class="food-card-name">${item.name}</h3>
          <p class="food-card-desc">${item.description || ''}</p>
          <div class="food-card-footer">
            <span class="food-card-price">${item.price} SAR</span>
            <button class="btn btn-gold btn-sm" onclick="App.addToCart({id:${item.id}, name:'${item.name.replace(/'/g, "\\'")}', price:${item.price}})"><i class="fas fa-plus"></i> Add</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // ===== ORDER ONLINE PAGE =====
  setupOrderFlow() {
    // Order category tabs
    document.querySelectorAll('#orderCategories .menu-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#orderCategories .menu-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderOrderMenu(tab.dataset.category);
      });
    });

    // Checkout button on order page
    const checkoutBtn = document.getElementById('orderCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (this.cart.length === 0) {
          this.toast('Your cart is empty', 'error');
          return;
        }
        this.openCart();
        // Show checkout form in drawer
        document.getElementById('checkoutForm').style.display = 'block';
        document.getElementById('cartBody').style.display = 'none';
        document.getElementById('cartFooter').style.display = 'none';
      });
    }

    // Checkout button in cart drawer
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      document.getElementById('checkoutForm').style.display = 'block';
      document.getElementById('cartBody').style.display = 'none';
      document.getElementById('cartFooter').style.display = 'none';
    });

    // Back button on checkout
    document.getElementById('checkoutBack').addEventListener('click', () => {
      document.getElementById('checkoutForm').style.display = 'none';
      document.getElementById('cartBody').style.display = 'block';
      document.getElementById('cartFooter').style.display = 'block';
    });

    // Order form submit
    document.getElementById('orderForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.placeOrder();
    });
  },

  renderOrderMenu(category) {
    const grid = document.getElementById('orderGrid');
    if (!grid) return;

    const items = category === 'all'
      ? this.menuItems
      : this.menuItems.filter(i => i.category === category);

    if (items.length === 0) {
      grid.innerHTML = '<div class="loader">No items in this category</div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="food-card">
        <img src="/uploads/${item.image}" class="food-card-img" alt="${item.name}" onerror="this.src='/images/hero-1.jpg'">
        <div class="food-card-body">
          <h3 class="food-card-name">${item.name}</h3>
          <p class="food-card-desc">${item.description || ''}</p>
          <div class="food-card-footer">
            <span class="food-card-price">${item.price} SAR</span>
            <button class="btn btn-gold btn-sm" onclick="App.addToCart({id:${item.id}, name:'${item.name.replace(/'/g, "\\'")}', price:${item.price}})"><i class="fas fa-plus"></i> Add to Cart</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  async placeOrder() {
    if (this.cart.length === 0) {
      this.toast('Cart is empty', 'error');
      return;
    }

    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const table = document.getElementById('orderTable').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();

    if (!name || !phone) {
      this.toast('Name and phone number are required', 'error');
      return;
    }

    const items = this.cart.map(i => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
    }));

    const total = this.getCartTotal();

    const btn = document.getElementById('submitOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

    const result = await this.api('/orders', {
      method: 'POST',
      body: JSON.stringify({ customer_name: name, phone, table_number: table || null, items, total, notes }),
    });

    btn.disabled = false;
    btn.innerHTML = 'Place Order <i class="fas fa-check"></i>';

    if (result.success) {
      this.toast('Order placed successfully! 🎉', 'success');
      this.clearCart();
      this.closeCart();
      document.getElementById('orderForm').reset();
    } else {
      this.toast(result.message || 'Failed to place order', 'error');
    }
  },

  // ===== RESERVATIONS =====
  setupReservationForm() {
    const form = document.getElementById('reservationForm');
    if (!form) return;

    // Set min date to today
    const dateInput = document.getElementById('resDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('resName').value.trim();
      const phone = document.getElementById('resPhone').value.trim();
      const email = document.getElementById('resEmail').value.trim();
      const date = document.getElementById('resDate').value;
      const time = document.getElementById('resTime').value;
      const guests = parseInt(document.getElementById('resGuests').value);
      const notes = document.getElementById('resNotes').value.trim();

      if (!name || !phone || !date || !time || !guests) {
        this.toast('Please fill in all required fields', 'error');
        return;
      }

      const btn = document.getElementById('reservationSubmit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';

      const result = await this.api('/reservations', {
        method: 'POST',
        body: JSON.stringify({ customer_name: name, phone, email, date, time, guests, notes }),
      });

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Reservation';

      if (result.success) {
        this.toast('Reservation booked! We\'ll confirm shortly 🙏', 'success');
        form.reset();
      } else {
        this.toast(result.message || 'Failed to book reservation', 'error');
      }
    });
  },

  // ===== CONTACT =====
  setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('contactName').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const message = document.getElementById('contactMessage').value.trim();

      if (!name || !email || !message) {
        this.toast('Name, email, and message are required', 'error');
        return;
      }

      const btn = document.getElementById('contactSubmit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      const result = await this.api('/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, message }),
      });

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';

      if (result.success) {
        this.toast('Message sent! We\'ll get back to you soon ✨', 'success');
        form.reset();
      } else {
        this.toast(result.message || 'Failed to send message', 'error');
      }
    });
  },

  // ===== GALLERY =====
  setupGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    // Use menu images + interior images for gallery
    const galleryImages = [];
    for (let i = 1; i <= 24; i++) {
      galleryImages.push(`/uploads/menu-${i}.jpg`);
    }
    galleryImages.push(
      '/images/interior-1.jpg',
      '/images/interior-2.jpg',
      '/images/interior-3.jpg',
      '/images/hero-1.jpg',
      '/images/hero-2.jpg',
      '/images/bg-hero.jpg'
    );

    grid.innerHTML = galleryImages.map(src => `
      <div class="gallery-item">
        <img src="${src}" alt="Full Protein Gallery" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>
    `).join('');
  },
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => App.init());
