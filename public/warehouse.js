document.addEventListener('DOMContentLoaded', () => {
  const warehouseTable = document.getElementById('tbl-warehouse');
  const ticker = document.getElementById('tickerText');

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  const updateTicker = (text) => {
    ticker.textContent = text;
  };

  const fetchWarehouseData = async () => {
    try {
      updateTicker('Fetching warehouse stock expiry report...');
      const response = await fetch('https://prod.wmsgmpl.com:3010/api/v1/account_report/whStockExpiryReport');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const warehouseData = result.data && result.data[1] ? result.data[1] : [];

      if (warehouseData.length > 0) {
        populateWarehouseTable(warehouseData);
        updateTicker('Warehouse data loaded successfully.');
      } else {
        warehouseTable.innerHTML = '<tr><td colspan="9" style="text-align:center;">No data available.</td></tr>';
        updateTicker('No warehouse data found.');
      }
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      warehouseTable.innerHTML = `<tr><td colspan="9" style="text-align:center;">Error loading data: ${error.message}</td></tr>`;
      updateTicker('Failed to load warehouse data.');
    }
  };

  const populateWarehouseTable = (data) => {
    let tableHTML = '';
    data.forEach(item => {
      tableHTML += `
        <tr>
          <td>${item.Warehouse}</td>
          <td class="num">${item.Present_Product_Count}</td>
          <td class="num">${formatCurrency(item.Present_Stock_Value)}</td>
          <td class="num">${item.Expiry_90_Product_Count}</td>
          <td class="num">${formatCurrency(item.Expiry_90_Value)}</td>
          <td class="num">${item.Expiry_60_Product_Count}</td>
          <td class="num">${formatCurrency(item.Expiry_60_Value)}</td>
          <td class="num">${item.Expiry_30_Product_Count}</td>
          <td class="num">${formatCurrency(item.Expiry_30_Value)}</td>
        </tr>
      `;
    });
    warehouseTable.innerHTML = tableHTML;
  };

  // Initial data fetch
  fetchWarehouseData();

  // Auto-refresh data every 5 minutes (300000 ms)
  setInterval(fetchWarehouseData, 300000);

  // Clock and other UI initializations can be added here if needed, similar to app.js
  // For now, keeping it focused on the warehouse data.
});
