const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORY_COLORS = {
    'Food & Health': '#3b9c67',
    'Entertainments': '#f59e0b',
    'Shopping': '#3b82f6',
    'Investment': '#8b5cf6',
    'Transfer': '#06b6d4',
    'Salary': '#10b981'
};

// State
let currentCurrency = localStorage.getItem('selectedCurrency') || 'R';
let spendingLimit = parseFloat(localStorage.getItem('spendingLimit')) || 4645.00;
let activeMonth = 3; // April highlighted by default
let chartMetric = 'both';
let chartRange = 'yearly';
let typeFilter = 'All';
let categoryFilter = 'All';
let sortMode = 'newest';

const defaultTransactions = [
    { id: 1, text: 'Monthly Salary', amount: 2645.00, category: 'Salary', month: 3, date: '15 Apr 2026' },
    { id: 2, text: 'Food & Health Essentials', amount: -663.00, category: 'Food & Health', month: 3, date: '14 Apr 2026' },
    { id: 3, text: 'Entertainments & Streaming', amount: -248.00, category: 'Entertainments', month: 3, date: '12 Apr 2026' },
    { id: 4, text: 'Shopping & Retail', amount: -492.00, category: 'Shopping', month: 3, date: '09 Apr 2026' },
    { id: 5, text: 'Satrix Top 40 ETF Investment', amount: -492.00, category: 'Investment', month: 3, date: '05 Apr 2026' }
];

let transactions = JSON.parse(localStorage.getItem('dashboardTransactionsV2')) || defaultTransactions;

// Currency formatter
function formatMoney(num, decimals = 2) {
    return `${currentCurrency}${Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}`;
}

// Universal Three-Dots & Dropdown Controller
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-menu]');
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (!trigger || menu.id !== trigger.dataset.menu) {
            menu.classList.remove('open');
        }
    });
    if (trigger) {
        e.stopPropagation();
        const targetMenu = document.getElementById(trigger.dataset.menu);
        if (targetMenu) targetMenu.classList.toggle('open');
    }
});

// KPI & Virtual Card Updater
function updateKPIs() {
    const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expense = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

    document.getElementById('kpi-income').innerText = formatMoney(income);
    document.getElementById('kpi-expense').innerText = formatMoney(expense);
    document.getElementById('vc-limit').innerText = formatMoney(spendingLimit);

    const pct = spendingLimit > 0 ? Math.min(100, Math.round((expense / spendingLimit) * 100)) : 0;
    document.getElementById('vc-progress').style.width = `${pct}%`;

    // Update Smart Spending Tip
    const tipEl = document.getElementById('spending-tip-text');
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    if (savingsRate >= 20) {
        tipEl.innerText = `Strong ${savingsRate}% savings rate! Moving R500 into an Index ETF can compound ~${formatMoney(500 * 1.105)} in 12 months.`;
    } else {
        tipEl.innerText = `Tip: Batching transfers via PayShap saves ~R45/mo in bank fees, and capping Shopping by 10% frees up extra investment capital.`;
    }
}

// Overview Bar Chart
function renderChart() {
    const barChartEl = document.getElementById('bar-chart');
    barChartEl.innerHTML = '';

    const baseHeights = [52, 46, 36, 68, 56, 42, 50, 44, 34, 40, 60, 48];
    let startIdx = 0;
    let endIdx = 12;

    if (chartRange === 'h1') endIdx = 6;
    if (chartRange === 'h2') startIdx = 6;

    for (let idx = startIdx; idx < endIdx; idx++) {
        const monthName = MONTHS[idx];
        const mTxs = transactions.filter(t => t.month === idx);
        const mInc = mTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const mExp = Math.abs(mTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

        const col = document.createElement('div');
        col.className = `bar-col ${idx === activeMonth ? 'active' : ''}`;
        col.onclick = () => {
            activeMonth = idx;
            renderChart();
        };

        const displayInc = mInc > 0 ? mInc : 984;
        const displayExp = mExp > 0 ? mExp : 789;
        const totalHeight = (mInc + mExp > 0)
            ? Math.min(100, Math.max(38, ((mInc + mExp) / 4800) * 100))
            : baseHeights[idx];

        let incRatio = 55;
        let expRatio = 45;
        if (chartMetric === 'income') { incRatio = 100; expRatio = 0; }
        if (chartMetric === 'expense') { incRatio = 0; expRatio = 100; }

        col.innerHTML = `
            <div class="bar-tooltip">
                <strong>${monthName} 2026</strong><br>
                <span style="color:#3b9c67">Income: ${formatMoney(displayInc, 0)}</span><br>
                <span style="color:#e04f3e">Expenses: ${formatMoney(displayExp, 0)}</span>
            </div>
            <div class="bar-stack" style="height: ${totalHeight}%">
                <div class="bar-inc" style="height: ${incRatio}%"></div>
                <div class="bar-exp" style="height: ${expRatio}%"></div>
            </div>
            <span class="bar-month">${monthName}</span>
        `;
        barChartEl.appendChild(col);
    }
}

// All Expenses Breakdown
function renderBreakdown() {
    const expenseTxs = transactions.filter(t => t.amount < 0);
    const totalExp = Math.abs(expenseTxs.reduce((s, t) => s + t.amount, 0));

    document.getElementById('breakdown-total').innerText = formatMoney(totalExp);
    document.getElementById('val-daily').innerText = formatMoney(totalExp / 30, 0);
    document.getElementById('val-weekly').innerText = formatMoney(totalExp / 4, 0);
    document.getElementById('val-monthly').innerText = formatMoney(totalExp, 0);

    const categories = ['Food & Health', 'Entertainments', 'Shopping', 'Investment'];
    const listEl = document.getElementById('category-breakdown');
    listEl.innerHTML = '';

    categories.forEach(cat => {
        const catTotal = Math.abs(
            expenseTxs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0)
        );
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="cat-left">
                <span class="cat-dot" style="background: ${CATEGORY_COLORS[cat]}"></span>
                <span>${cat}</span>
            </div>
            <span class="cat-amount">${formatMoney(catTotal, 0)}</span>
        `;
        listEl.appendChild(li);
    });

    // Update Portfolio Summary
    const investedTotal = Math.abs(
        expenseTxs.filter(t => t.category === 'Investment').reduce((s, t) => s + t.amount, 0)
    );
    document.getElementById('portfolio-total').innerText = formatMoney(investedTotal);
    document.getElementById('portfolio-proj').innerText = `+${formatMoney(investedTotal * 0.105)}`;
}

// Recent Transactions Table
function renderTransactions() {
    let list = [...transactions];

    if (typeFilter === 'income') list = list.filter(t => t.amount > 0);
    if (typeFilter === 'expense') list = list.filter(t => t.amount < 0);
    if (categoryFilter !== 'All') list = list.filter(t => t.category === categoryFilter);

    if (sortMode === 'highest') list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    if (sortMode === 'lowest') list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));

    const tbody = document.getElementById('tx-list');
    tbody.innerHTML = '';

    list.forEach(t => {
        const isInc = t.amount > 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.text}</strong></td>
            <td>${t.category}</td>
            <td>${t.date}</td>
            <td><span class="badge ${isInc ? 'income' : 'expense'}">${isInc ? 'Income' : 'Expense'}</span></td>
            <td style="font-weight:700; color: ${isInc ? '#3b9c67' : '#e04f3e'}">
                ${isInc ? '+' : '-'}${formatMoney(t.amount)}
            </td>
            <td>
                <button class="del-btn" onclick="deleteTransaction(${t.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Interactive Controls & Helpers
function filterByType(type) {
    typeFilter = type;
    renderTransactions();
}

function filterByCategory(cat) {
    categoryFilter = cat;
    renderTransactions();
}

function sortTransactions(mode) {
    sortMode = mode;
    renderTransactions();
}

function resetFilters() {
    typeFilter = 'All';
    categoryFilter = 'All';
    sortMode = 'newest';
    renderTransactions();
}

function setChartMetric(metric) {
    chartMetric = metric;
    renderChart();
}

function adjustCardLimit() {
    const newLim = prompt('Enter new monthly card spending limit:', spendingLimit);
    if (newLim && !isNaN(parseFloat(newLim))) {
        spendingLimit = parseFloat(newLim);
        localStorage.setItem('spendingLimit', spendingLimit);
        updateKPIs();
    }
}

// Daily / Weekly / Monthly tabs inside Breakdown card
document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.p-metric').forEach(m => m.classList.remove('active'));
        tab.classList.add('active');
        const period = tab.dataset.period;
        document.getElementById(`box-${period}`).classList.add('active');
    });
});

// Modals
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

function openTxModal(defaultType = 'expense') {
    closeAllModals();
    document.getElementById('tx-type').value = defaultType;
    document.getElementById('tx-modal').classList.add('open');
}

function openSendModal(method = 'PayShap Instant') {
    closeAllModals();
    document.getElementById('send-method').value = method;
    document.getElementById('send-modal').classList.add('open');
}

function openInvestModal(asset = 'S&P 500 / Satrix Top 40 ETF') {
    closeAllModals();
    const sel = document.getElementById('invest-asset');
    if ([...sel.options].some(o => o.value === asset)) sel.value = asset;
    document.getElementById('invest-modal').classList.add('open');
}

// Form Submissions
document.getElementById('tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('tx-text').value.trim();
    const amt = Math.abs(parseFloat(document.getElementById('tx-amount').value));
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const month = parseInt(document.getElementById('tx-month').value, 10);

    if (!text || isNaN(amt) || amt <= 0) return;

    transactions.unshift({
        id: Date.now(),
        text,
        amount: type === 'expense' ? -amt : amt,
        category,
        month,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    activeMonth = month;
    saveAndRender();
    e.target.reset();
    closeAllModals();
});

document.getElementById('send-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const recipient = document.getElementById('send-recipient').value.trim();
    const amt = Math.abs(parseFloat(document.getElementById('send-amount').value));
    const method = document.getElementById('send-method').value;

    if (!recipient || isNaN(amt) || amt <= 0) return;

    transactions.unshift({
        id: Date.now(),
        text: `Sent to ${recipient} (${method})`,
        amount: -amt,
        category: 'Transfer',
        month: activeMonth,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    saveAndRender();
    e.target.reset();
    closeAllModals();
});

document.getElementById('invest-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const asset = document.getElementById('invest-asset').value;
    const amt = Math.abs(parseFloat(document.getElementById('invest-amount').value));

    if (isNaN(amt) || amt <= 0) return;

    transactions.unshift({
        id: Date.now(),
        text: `Invested: ${asset}`,
        amount: -amt,
        category: 'Investment',
        month: activeMonth,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });

    saveAndRender();
    e.target.reset();
    closeAllModals();
});

document.getElementById('invest-amount').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    document.getElementById('invest-projection').innerText = `Projected 1-year value (~10.5%): ${formatMoney(val * 1.105)}`;
});

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndRender();
}

// Topbar & Filter Listeners
document.getElementById('currency-select').value = currentCurrency;
document.getElementById('currency-select').addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    localStorage.setItem('selectedCurrency', currentCurrency);
    renderAll();
});

document.getElementById('chart-range').addEventListener('change', (e) => {
    chartRange = e.target.value;
    renderChart();
});

document.getElementById('export-btn').addEventListener('click', () => {
    const headers = ['Description', 'Category', 'Date', 'Amount'];
    const rows = transactions.map(t => `"${t.text}","${t.category}","${t.date}",${t.amount}`);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'finance_dashboard_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function saveAndRender() {
    localStorage.setItem('dashboardTransactionsV2', JSON.stringify(transactions));
    renderAll();
}

function renderAll() {
    updateKPIs();
    renderChart();
    renderBreakdown();
    renderTransactions();
}

renderAll();