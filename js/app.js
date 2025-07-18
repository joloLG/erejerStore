// Supabase Client Initialization
const SUPABASE_URL = 'https://cmruajzwbqdwlqttigne.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcnVhanp3YnFkd2xxdHRpZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTAxMTAsImV4cCI6MjA2ODM4NjExMH0.OtROYQvwqjA3onj679sJcoYBuk2ZQyK6dakGDS78SfM'; // Replace with your Supabase anon key

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    // Router-like behavior based on page elements
    const productContainer = document.getElementById('product-container');
    const profitTodayEl = document.getElementById('profit-today');
    const inventoryTable = document.getElementById('inventoryTable');

    if (productContainer) {
        console.log('On index.html, loading products...');
        await loadProducts();
        console.log('Product data loaded, rendering products...');
        renderProducts(productContainer);
        console.log('Products rendered.');
    } else if (profitTodayEl) {
        console.log('On profit.html, loading profit data...');
        await loadProfitData();
    } else if (inventoryTable) {
        console.log('On inventory.html, loading inventory data...');
        await loadInventoryData();
        initializeInventoryPage();
    } else {
        console.log('No specific content container found on this page.');
    }
});

let productsData = [];
let categoriesData = {};

async function loadInventoryData() {
    console.log('Loading inventory data from Supabase...');
    const { data: products, error } = await _supabase
        .from('products')
        .select(`
            id,
            name,
            stock,
            price,
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
            <td>${product.categories.name}</td>
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
        const productData = {
            name: productNameInput.value,
            category_id: productCategoryInput.value,
            stock: productStockInput.value,
            price: productPriceInput.value,
        };

        const productId = productIdInput.value;
        let error;

        if (productId) {
            ({ error } = await _supabase.from('products').update(productData).eq('id', productId));
        } else {
            ({ error } = await _supabase.from('products').insert([productData]));
        }

        if (error) {
            console.error('Error saving product:', error);
            alert(`Failed to save product: ${error.message}`);
        } else {
            productModal.hide();
            await loadInventoryData(); // Refresh the table
        }
    });
}

async function loadProfitData() {
    console.log('Loading profit data from Supabase...');
    const { data: sales, error } = await _supabase
        .from('sales')
        .select(`
            quantity_sold,
            total_price,
            sold_at,
            products (name)
        `)
        .order('sold_at', { ascending: false });

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    // Calculate profits
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let profitToday = 0;
    let profitWeek = 0;
    let profitMonth = 0;

    sales.forEach(sale => {
        const saleDate = new Date(sale.sold_at);
        if (saleDate >= today) {
            profitToday += sale.total_price;
        }
        if (saleDate >= startOfWeek) {
            profitWeek += sale.total_price;
        }
        if (saleDate >= startOfMonth) {
            profitMonth += sale.total_price;
        }
    });

    // Update UI for profit cards
    document.getElementById('profit-today').textContent = `₱${profitToday.toFixed(2)}`;
    document.getElementById('profit-week').textContent = `₱${profitWeek.toFixed(2)}`;
    document.getElementById('profit-month').textContent = `₱${profitMonth.toFixed(2)}`;

    // Populate recent sales table
    const recentSalesTableBody = document.querySelector('#recentSalesTable tbody');
    recentSalesTableBody.innerHTML = ''; // Clear existing data

    const recentSales = sales.slice(0, 20); // Show latest 20 sales
    recentSales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sale.products.name}</td>
            <td>${sale.quantity_sold}</td>
            <td>₱${sale.total_price.toFixed(2)}</td>
            <td>${new Date(sale.sold_at).toLocaleString()}</td>
        `;
        recentSalesTableBody.appendChild(row);
    });
}

async function loadProducts() {
    console.log('Attempting to load products from Supabase...');
    const { data, error } = await _supabase
        .from('products')
        .select(`
            id,
            name,
            price,
            stock,
            categories (id, name)
        `);

    if (error) {
        console.error('Error fetching products:', error);
        alert('Failed to fetch products from Supabase. Check the console for details.');
        productsData = [];
        categoriesData = {};
        return;
    }
    console.log('Successfully fetched products:', data);
    productsData = data;
    // Organize products by category for rendering
    categoriesData = productsData.reduce((acc, product) => {
        const categoryName = product.categories.name;
        if (!acc[categoryName]) {
            acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        return acc;
    }, {});
}

function renderProducts(container) {
    console.log('Entering renderProducts function');
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
            productCol.className = 'col-md-4 col-sm-6 mb-3'; // Responsive grid: 3 items on medium, 2 on small screens

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

        // Update product stock in Supabase
        const { error: updateError } = await _supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', product.id);

        if (updateError) {
            console.error('Error updating stock:', updateError);
            alert('Failed to update stock. Please try again.');
            return;
        }

        // Record the sale in Supabase
        const { error: saleError } = await _supabase
            .from('sales')
            .insert([{ product_id: product.id, quantity_sold: quantity, total_price: totalPrice }]);

        if (saleError) {
            console.error('Error recording sale:', saleError);
            // Attempt to revert stock change if sale fails
            await _supabase.from('products').update({ stock: product.stock }).eq('id', product.id);
            alert('Failed to record sale. Please try again.');
            return;
        }

        // Update local data and re-render
        product.stock = newStock;
        renderProducts(document.getElementById('product-container'));

        sellModal.hide();
        alert(`${quantity} of ${product.name} sold successfully!`);
    };

    sellModal.show();
}
