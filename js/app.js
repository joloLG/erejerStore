// Supabase Client Initialization
const SUPABASE_URL = 'https://cmruajzwbqdwlqttigne.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcnVhanp3YnFkd2xxdHRpZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTAxMTAsImV4cCI6MjA2ODM4NjExMH0.OtROYQvwqjA3onj679sJcoYBuk2ZQyK6dakGDS78SfM'; // Replace with your Supabase anon key

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');

document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar Toggler
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

    console.log('DOM fully loaded and parsed');
    // Router-like behavior based on page elements
    const productContainer = document.getElementById('product-container');
    const profitTodayEl = document.getElementById('profit-today');
    const inventoryTable = document.getElementById('inventoryTable');

    if (productContainer) {
        loadProducts();
    } else if (profitTodayEl) {
        loadProfitData();
    } else if (inventoryTable) {
        loadInventoryData();
        initializeInventoryPage();
    }
});

let productsData = [];
let categoriesData = {};

async function loadInventoryData() {
    const { data: products, error } = await _supabase
        .from('products')
        .select(`
            *,
            categories (name)
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching inventory:', error);
        return;
    }

    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    inventoryTableBody.innerHTML = ''; // Clear existing data

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.categories ? product.categories.name : 'N/A'}</td>
            <td>${product.stock}</td>
            <td>₱${product.price.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-warning edit-btn" data-id="${product.id}">Edit</button>
            </td>
        `;
        inventoryTableBody.appendChild(row);
    });
}

async function initializeInventoryPage() {
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const productModalLabel = document.getElementById('productModalLabel');
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productCategoryInput = document.getElementById('productCategory');
    const productStockInput = document.getElementById('productStock');
    const productPriceInput = document.getElementById('productPrice');

    // Fetch categories and populate dropdown
    const { data: categories, error: catError } = await _supabase.from('categories').select('*').order('name');
    if (catError) {
        console.error('Error fetching categories:', catError);
    } else {
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    // Handle "Add New Item" button click
    document.getElementById('addItemBtn').addEventListener('click', () => {
        productModalLabel.textContent = 'Add New Product';
        productForm.reset();
        productIdInput.value = '';
        productModal.show();
    });

    // Handle "Edit" button click (using event delegation)
    document.getElementById('inventoryTable').addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const { data: product, error } = await _supabase.from('products').select('*').eq('id', id).single();

            if (error) {
                console.error('Error fetching product for edit:', error);
                alert('Could not load product details.');
                return;
            }

            productModalLabel.textContent = 'Edit Product';
            productIdInput.value = product.id;
            productNameInput.value = product.name;
            productCategoryInput.value = product.category_id;
            productStockInput.value = product.stock;
            productPriceInput.value = product.price;
            
            productModal.show();
        }
    });

    // Handle form submission
    document.getElementById('saveProductBtn').addEventListener('click', async () => {
        const productId = productIdInput.value;
        const productData = {
            name: productNameInput.value,
            category_id: productCategoryInput.value,
            stock: parseInt(productStockInput.value, 10),
            price: parseFloat(productPriceInput.value),
        };

        const { data, error } = productId 
            ? await _supabase.from('products').update(productData).eq('id', productId)
            : await _supabase.from('products').insert([productData]);

        if (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product.');
        } else {
            productModal.hide();
            loadInventoryData();
        }
    });
}

async function loadProfitData({ selectedDate, selectedMonth } = {}) {
    let { data: sales, error } = await _supabase
        .from('sales')
        .select(`
            *,
            products (*,
                categories (*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    const salesWithProductDetails = sales;

    const datePicker = document.getElementById('date-picker');
    const now = new Date();

    // Set initial date in picker if not set and no month is selected
    if (datePicker && !selectedDate && !selectedMonth) {
        datePicker.valueAsDate = new Date();
    }

    const targetDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of Saturday
    const monthPicker = document.getElementById('month-picker');
    if (monthPicker && !selectedMonth) {
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        monthPicker.value = `${year}-${month}`;
    }

    const startOfMonth = selectedMonth 
        ? new Date(selectedMonth + '-01T00:00:00') 
        : new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);

    const endOfMonth = selectedMonth 
        ? new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)
        : new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

    let profitToday = 0;
    let profitWeek = 0;
    let profitMonth = 0;
    const categoryProfitToday = {};

    const salesForDay = [];
    salesWithProductDetails.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        const saleDay = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());

        // Daily calculations are only performed when a specific day is selected
        if (selectedDate && saleDay.getTime() === targetDate.getTime()) {
            salesForDay.push(sale);
            profitToday += sale.total_price;
            if (sale.products && sale.products.categories) {
                const categoryName = sale.products.categories.name;
                if (!categoryProfitToday[categoryName]) {
                    categoryProfitToday[categoryName] = 0;
                }
                categoryProfitToday[categoryName] += sale.total_price;
            }
        } else if (!selectedDate && saleDay.getTime() === targetDate.getTime()) {
            // still calculate today's profit if no date is picked
            profitToday += sale.total_price;
            if (sale.products && sale.products.categories) {
                const categoryName = sale.products.categories.name;
                if (!categoryProfitToday[categoryName]) {
                    categoryProfitToday[categoryName] = 0;
                }
                categoryProfitToday[categoryName] += sale.total_price;
            }
        }

        if (saleDate >= startOfWeek && saleDate <= endOfWeek) {
            profitWeek += sale.total_price;
        }
        if (saleDate >= startOfMonth && saleDate < endOfMonth) {
            profitMonth += sale.total_price;
        }
    });

    const profitTodayEl = document.getElementById('profit-today');
    if (profitTodayEl) profitTodayEl.textContent = `₱${profitToday.toFixed(2)}`;

    const profitWeekEl = document.getElementById('profit-week');
    if (profitWeekEl) profitWeekEl.textContent = `₱${profitWeek.toFixed(2)}`;

    const profitMonthEl = document.getElementById('profit-month');
    if (profitMonthEl) profitMonthEl.textContent = `₱${profitMonth.toFixed(2)}`;

    // Add event listeners if not already attached
    if (datePicker && !datePicker.dataset.listenerAttached) {
        datePicker.addEventListener('change', (e) => {
            const monthPicker = document.getElementById('month-picker');
            if(monthPicker) monthPicker.value = ''; // Clear month picker
            loadProfitData({ selectedDate: e.target.value });
        });
        datePicker.dataset.listenerAttached = 'true';
    }

    if (monthPicker && !monthPicker.dataset.listenerAttached) {
        monthPicker.addEventListener('change', (e) => {
            const datePicker = document.getElementById('date-picker');
            if(datePicker) datePicker.value = ''; // Clear date picker
            loadProfitData({ selectedMonth: e.target.value });
        });
        monthPicker.dataset.listenerAttached = 'true';
    }

    const categoryContainer = document.getElementById('category-profit-container');
    if (categoryContainer) {
        categoryContainer.innerHTML = ''; // Clear existing data
        for (const categoryName in categoryProfitToday) {
            const profit = categoryProfitToday[categoryName];
            const p = document.createElement('p');
            p.innerHTML = `We've sold <strong>₱${profit.toFixed(2)}</strong> on ${categoryName}.`;
            categoryContainer.appendChild(p);
        }
    }

    const recentSalesTableBody = document.querySelector('#recentSalesTable tbody');
    if(recentSalesTableBody) {
        recentSalesTableBody.innerHTML = ''; // Clear existing data
        const salesToShow = selectedDate ? salesForDay : sales.slice(0, 20);
        salesToShow.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sale.products ? sale.products.name : 'N/A'}</td>
                <td>${sale.quantity_sold}</td>
                <td>₱${sale.total_price.toFixed(2)}</td>
                <td>${new Date(sale.created_at).toLocaleString()}</td>
            `;
            recentSalesTableBody.appendChild(row);
        });
    }
}

async function loadProducts() {
    let { data: products, error } = await _supabase
        .from('products')
        .select(`
            *,
            categories (
                name
            )
        `);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    productsData = products;

    // Group products by category
    categoriesData = products.reduce((acc, product) => {
        const category = product.categories ? product.categories.name : 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {});

    const productContainer = document.getElementById('product-container');
    if (productContainer) {
        renderProducts(productContainer);
    }
}

function renderProducts(container) {
    container.innerHTML = ''; // Clear existing content

    for (const categoryName in categoriesData) {
        const category = categoriesData[categoryName];

        // Create a container for the category
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-4';

        // Add category title
        const categoryTitle = document.createElement('h4');
        categoryTitle.className = 'mb-3';
        categoryTitle.textContent = categoryName;
        categoryDiv.appendChild(categoryTitle);

        const productList = document.createElement('div');
        productList.className = 'row';

        category.forEach(product => {
            const productCol = document.createElement('div');
            productCol.className = 'col-md-4 col-sm-6 mb-3';

            const productCard = document.createElement('div');
            productCard.className = 'card h-100';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body d-flex flex-column';

            const productDetails = `
                <h5 class="card-title">${product.name}</h5>
                <p class="card-text">Price: ₱${product.price}</p>
                <p class="card-text"><small class="text-muted">Stock: ${product.stock}</small></p>
                <button class="btn btn-primary mt-auto" onclick="handleSell('${product.name}', '${categoryName}')">SELL</button>
            `;

            cardBody.innerHTML = productDetails;
            productCard.appendChild(cardBody);
            productCol.appendChild(productCard);
            productList.appendChild(productCol);
        });

        categoryDiv.appendChild(productList);
        container.appendChild(categoryDiv);
    }
}

function handleSell(productName, categoryName) {
    const product = categoriesData[categoryName].find(p => p.name === productName);
    if (!product) {
        console.error('Product not found!');
        return;
    }

    const sellModal = new bootstrap.Modal(document.getElementById('sellModal'));
    const modalTitle = document.getElementById('sellModalLabel');
    const modalProductName = document.getElementById('sellModalProductName');
    const quantityLabel = document.getElementById('sellModalQuantityLabel');
    const quantityInput = document.getElementById('sellQuantityInput');
    const confirmSellBtn = document.getElementById('confirmSellBtn');

    modalTitle.textContent = `Sell ${product.name}`;
    modalProductName.textContent = `Price: ₱${product.price} | Stock: ${product.stock}`;

    if (categoryName === 'Load') {
        quantityLabel.textContent = 'Load Amount';
        quantityInput.placeholder = 'Enter amount';
    } else {
        quantityLabel.textContent = 'Quantity';
        quantityInput.placeholder = 'Enter quantity';
    }
    quantityInput.min = '1';
    quantityInput.max = product.stock;
    quantityInput.value = '1';

    confirmSellBtn.onclick = async () => {
        const quantity = parseInt(quantityInput.value, 10);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }

        if (quantity > product.stock) {
            alert('Not enough stock!');
            return;
        }

        const newStock = product.stock - quantity;
        const totalPrice = quantity * product.price;

        // 1. Update product stock
        const { error: stockError } = await _supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', product.id);

        if (stockError) {
            console.error('Error updating stock:', stockError);
            alert('Failed to update stock.');
            return;
        }

        // 2. Record the sale
        const { error: saleError } = await _supabase
            .from('sales')
            .insert([{ product_id: product.id, quantity_sold: quantity, total_price: totalPrice }]);

        if (saleError) {
            console.error('Error recording sale:', saleError);
            alert('Failed to record sale.');
            // Note: Here you might want to handle the stock update reversal
            return;
        }

        sellModal.hide();
        loadProducts(); // Refresh product list
    };

    sellModal.show();
}
