document.addEventListener('DOMContentLoaded', () => {
  let catChart, stateChart, ytdDonut, frRegChart, medicineCatChart;

  const formatCurrency = (num) => `₹${formatNumber(num)}`;
  const formatNumber = (num) => num.toLocaleString('en-IN');

  async function fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return null;
    }
  }

  function updateClock() {
    const now = new Date();
    document.querySelector('.clock').textContent = now.toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  async function updateHighlights() {
    const data = await fetchData('/api/highlights');
    if (data) {
      document.getElementById('tickerText').textContent = data.join(' • ');
    }
  }

  async function updateCategoryPerformance() {
    // Set loading state for elements related to this update
    document.getElementById('kpi-total').textContent = 'Loading...';
    document.getElementById('kpi-growth').textContent = 'Loading...';
    document.getElementById('kpi-topcat').textContent = 'Loading...';
    const tableBody = document.getElementById('tbl-category');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/franchise/purchaseCategorywiseFrPerformance');
    if (!data || !data.success || !data.data || data.data.length === 0) {
      document.getElementById('kpi-total').textContent = 'Error';
      document.getElementById('kpi-growth').textContent = 'Error';
      document.getElementById('kpi-topcat').textContent = 'Error';
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Error loading data.</td></tr>';
      return;
    }

    const performanceData = data.data;

    const labels = performanceData.map(item => item.category_name);
    const ytdCurrent = performanceData.map(item => item.YTD_Current_Year);
    const ytdLast = performanceData.map(item => item.YTD_Last_Year);

    const totalCurrent = ytdCurrent.reduce((a, b) => a + b, 0);
    const totalLast = ytdLast.reduce((a, b) => a + b, 0);
    const growth = totalLast > 0 ? ((totalCurrent - totalLast) / totalLast) * 100 : 0;
    
    const topCategoryIndex = ytdCurrent.indexOf(Math.max(...ytdCurrent));
    const topCategory = labels[topCategoryIndex];

    document.getElementById('kpi-total').textContent = formatCurrency(totalCurrent);
    document.getElementById('kpi-growth').textContent = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
    document.getElementById('kpi-topcat').textContent = topCategory;

    tableBody.innerHTML = performanceData.map(item => {
      const itemGrowth = item.YTD_Last_Year > 0 ? ((item.YTD_Current_Year - item.YTD_Last_Year) / item.YTD_Last_Year) * 100 : 0;
      const growthClass = itemGrowth >= 0 ? 'kpi--green' : 'kpi--red';
      return `
        <tr>
          <td>${item.category_name}</td>
          <td class="num">${formatNumber(item.YTD_Last_Year)}</td>
          <td class="num">${formatNumber(item.YTD_Current_Year)}</td>
          <td class="num ${growthClass}">${itemGrowth.toFixed(1)}%</td>
        </tr>`;
    }).join('');

    if (catChart) {
      catChart.data.labels = labels;
      catChart.data.datasets[0].data = ytdCurrent;
      catChart.data.datasets[1].data = ytdLast;
      catChart.update();
    }
  }

  async function updateStateFranchise() {
    // Set loading state for elements related to this update
    document.getElementById('tbl-states').innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    document.getElementById('stateKpi').textContent = 'Loading...';
    
    const data = await fetchData('/api/state-franchise');
    if (!data) {
      document.getElementById('tbl-states').innerHTML = '<tr><td colspan="5" style="text-align:center;">Error loading data.</td></tr>';
      document.getElementById('stateKpi').textContent = 'Error';
      return;
    }

    const tableBody = document.getElementById('tbl-states');
    let totalFranchises = 0;
    tableBody.innerHTML = data.map(item => {
      const total = item.active + item.inactive;
      totalFranchises += total;
      return `
        <tr>
          <td>${item.sr}</td>
          <td>${item.state}</td>
          <td class="num">${formatNumber(item.active)}</td>
          <td class="num">${formatNumber(item.inactive)}</td>
          <td class="num">${formatNumber(total)}</td>
        </tr>`;
    }).join('');
    
    document.getElementById('stateKpi').textContent = `${formatNumber(totalFranchises)} Total`;

    if (stateChart) {
      stateChart.data.labels = data.map(s => s.state);
      stateChart.data.datasets[0].data = data.map(s => s.active + s.inactive);
      stateChart.update();
    }
  }

  async function updateFranchiseStats() {
    // Set loading state for elements related to this update
    document.getElementById('tbl-newfr').innerHTML = '<tr><td>Loading...</td><td class="num">Loading...</td></tr>';
    
    const data = await fetchData('/api/fr-registration-stats');
    if (!data) {
      document.getElementById('tbl-newfr').innerHTML = '<tr><td>Error loading data.</td><td class="num">Error</td></tr>';
      return;
    }

    // Update "New Franchise Business" (Slide 3)
    const tableBody = document.getElementById('tbl-newfr');
    tableBody.innerHTML = `
      <tr><td>MTD</td><td class="num">${formatNumber(data.MTD)}</td></tr>
      <tr><td>YTD</td><td class="num">${formatNumber(data.YTD)}</td></tr>
      <tr><td>Last Year YTD</td><td class="num">${formatNumber(data.Last_Year_YTD)}</td></tr>
      <tr><td>Growth</td><td class="num kpi--green">+${parseFloat(data.Growth_Percentage).toFixed(1)}%</td></tr>
    `;
    if (frRegChart) {
      frRegChart.data.datasets[0].data = [data.YTD, data.Last_Year_YTD];
      frRegChart.update();
    }
  }

  async function updateNewFranchiseYTDPerformance() {
    const data = await fetchData('/api/new-franchise-ytd-performance');
    if (!data) return;

    const perfData = data.data && data.data[0] ? data.data[0] : {};

    const tableBody = document.getElementById('tbl-new-ytd');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr><td>Total Registered YTD</td><td class="num">${formatNumber(perfData.Total_Registered_YTD)}</td></tr>
        <tr><td>Started YTD</td><td class="num">${formatNumber(perfData.Started_YTD)}</td></tr>
        <tr><td>Excluding W.S Purchase MTD</td><td class="num">${formatCurrency(perfData.Excl_WS_Purchase_MTD)}</td></tr>
        <tr><td>Excluding W.S Purchase YTD</td><td class="num">${formatCurrency(perfData.Excl_WS_Purchase_YTD)}</td></tr>
      `;
    }

    // Update "Excluding W.S Purchase Amount" (Slide 6)
    // These elements might not exist in the HTML, so check for their existence
    const mtdWSel = document.getElementById('mtdWS');
    if (mtdWSel) mtdWSel.textContent = formatCurrency(perfData.Excl_WS_Purchase_MTD);
    const ytdWSel = document.getElementById('ytdWS');
    if (ytdWSel) ytdWSel.textContent = formatCurrency(perfData.Excl_WS_Purchase_YTD);
  }

  async function updateTeamPunch() {
    // Set loading state for elements related to this update
    document.getElementById('tp-inproc').textContent = 'Loading...';
    document.getElementById('tp-started').textContent = 'Loading...';
    document.getElementById('tp-ftd').textContent = 'Loading...';
    const tableBody = document.getElementById('tbl-team');
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Loading...</td></tr>';
    
    const data = await fetchData('/api/team-punch');
    if (!data) {
      document.getElementById('tp-inproc').textContent = 'Error';
      document.getElementById('tp-started').textContent = 'Error';
      document.getElementById('tp-ftd').textContent = 'Error';
      tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Error loading data.</td></tr>';
      return;
    }

    document.getElementById('tp-inproc').textContent = formatNumber(data.inProcess);
    document.getElementById('tp-started').textContent = formatNumber(data.started);
    document.getElementById('tp-ftd').textContent = formatNumber(data.transferToFTD);
    
    tableBody.innerHTML = Object.entries(data).map(([key, value]) => `
      <tr>
        <td>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
        <td class="num">${formatNumber(value)}</td>
      </tr>
    `).join('');
  }

  async function getOnlineSalesMetrics() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    // Determine fiscal year start (April 1st)
    const fiscalYearStartMonth = 3; // April is 3 (0-indexed)

    let currentFiscalYear = currentYear;
    if (currentMonth < fiscalYearStartMonth) {
      currentFiscalYear--; // If before April, fiscal year started last calendar year
    }

    const currentFiscalYearStartDate = new Date(currentFiscalYear, fiscalYearStartMonth, 1);
    const lastFiscalYearStartDate = new Date(currentFiscalYear - 1, fiscalYearStartMonth, 1);

    // Format dates for API
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Current YTD: April 1st of current fiscal year to today
    const currentYTD_fromDate = formatDate(currentFiscalYearStartDate);
    const currentYTD_toDate = formatDate(today);

    // Last YTD: April 1st of previous fiscal year to equivalent date in previous year
    const lastYTD_toDate = new Date(today);
    lastYTD_toDate.setFullYear(today.getFullYear() - 1);
    const lastYTD_fromDate = formatDate(lastFiscalYearStartDate);
    const lastYTD_toDateFormatted = formatDate(lastYTD_toDate);

    // MTD: 1st of current month to today
    const currentMonthStartDate = new Date(currentYear, currentMonth, 1);
    const MTD_fromDate = formatDate(currentMonthStartDate);
    const MTD_toDate = formatDate(today);

    const onlineSalesEndpoint = 'https://genericartsales.kredpool.in/online-sales';

    let mtdTotal = 0;
    let ytdTotal = 0;
    let lastYtdTotal = 0;

    try {
      // Fetch data for current YTD
      const currentYTD_url = `${onlineSalesEndpoint}?fromDate=${currentYTD_fromDate}&toDate=${currentYTD_toDate}`;
      const currentYTD_data = await fetchData(currentYTD_url);
      if (currentYTD_data && currentYTD_data.status === 1 && currentYTD_data.data) {
        ytdTotal = currentYTD_data.data.reduce((sum, item) => sum + parseFloat(item.total_paid_amount || 0), 0);
      }

      // Fetch data for last YTD
      const lastYTD_url = `${onlineSalesEndpoint}?fromDate=${lastYTD_fromDate}&toDate=${lastYTD_toDateFormatted}`;
      const lastYTD_data = await fetchData(lastYTD_url);
      if (lastYTD_data && lastYTD_data.status === 1 && lastYTD_data.data) {
        lastYtdTotal = lastYTD_data.data.reduce((sum, item) => sum + parseFloat(item.total_paid_amount || 0), 0);
      }

      // Fetch data for MTD
      const MTD_url = `${onlineSalesEndpoint}?fromDate=${MTD_fromDate}&toDate=${MTD_toDate}`;
      const MTD_data = await fetchData(MTD_url);
      if (MTD_data && MTD_data.status === 1 && MTD_data.data) {
        mtdTotal = MTD_data.data.reduce((sum, item) => sum + parseFloat(item.total_paid_amount || 0), 0);
      }

    } catch (error) {
      console.error('Error fetching online sales data:', error);
    }

    return {
      Sale_Source: 'Online Sales',
      MTD_Total_Amount: mtdTotal,
      YTD_Total_Amount: ytdTotal,
      Last_YTD_Total_Amount: lastYtdTotal
    };
  }

  async function updateSourceRevenue() {
    const tableBody = document.getElementById('tbl-source-revenue');
    if (!tableBody) return;

    // Set loading state
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
      const [sourceRevenueResponse, onlineSalesMetrics] = await Promise.all([
        fetch('https://prod.wmsgmpl.com:3010/api/v1/account_report/sourceWiseRevenueReport'),
        getOnlineSalesMetrics()
      ]);

      if (!sourceRevenueResponse.ok) {
        throw new Error(`HTTP error! status: ${sourceRevenueResponse.status}`);
      }
      const sourceRevenueResult = await sourceRevenueResponse.json();
      let data = sourceRevenueResult.data && sourceRevenueResult.data[1] ? sourceRevenueResult.data[1] : [];

      // Add online sales data
      data.push(onlineSalesMetrics);

      if (data && data.length > 0) {
        let tableHTML = '';
        data.forEach(item => {
          const growth = item.Last_YTD_Total_Amount > 0 ? ((item.YTD_Total_Amount - item.Last_YTD_Total_Amount) / item.Last_YTD_Total_Amount) * 100 : 0;
          const growthClass = growth >= 0 ? 'kpi--green' : 'kpi--red';
          tableHTML += `
            <tr>
              <td>${item.Sale_Source}</td>
              <td class="num">${formatCurrency(item.MTD_Total_Amount)}</td>
              <td class="num">${formatCurrency(item.YTD_Total_Amount)}</td>
              <td class="num">${formatCurrency(item.Last_YTD_Total_Amount)}</td>
              <td class="num ${growthClass}">${growth.toFixed(2)}%</td>
            </tr>
          `;
        });
        tableBody.innerHTML = tableHTML;
      } else {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No data available.</td></tr>';
      }
    } catch (error) {
      console.error('Error fetching source revenue data:', error);
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Error loading data: ${error.message}</td></tr>`;
    }
  }

  async function updateWarehouseReport() {
    const warehouseTable = document.getElementById('tbl-warehouse');
    if (!warehouseTable) return;

    // Set loading state
    warehouseTable.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading...</td></tr>';

    try {
      const response = await fetch('https://prod.wmsgmpl.com:3010/api/v1/account_report/whStockExpiryReport');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const warehouseData = result.data && result.data[1] ? result.data[1] : [];

      if (warehouseData.length > 0) {
        let tableHTML = '';
        warehouseData.forEach(item => {
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
      } else {
        warehouseTable.innerHTML = '<tr><td colspan="9" style="text-align:center;">No data available.</td></tr>';
      }
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      warehouseTable.innerHTML = `<tr><td colspan="9" style="text-align:center;">Error loading data: ${error.message}</td></tr>`;
    }
  }

  function initializeCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#f8fafc', font: { size: 14 } } } },
      scales: {
        y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9aa7b6' } },
        x: { grid: { display: false }, ticks: { color: '#9aa7b6' } }
      }
    };

    catChart = new Chart(document.getElementById('catChart').getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [
        { label: 'Current YTD', data: [], backgroundColor: 'rgba(14, 165, 233, 0.85)', hoverBackgroundColor: 'rgba(14, 165, 233, 1)' },
        { label: 'Previous YTD', data: [], backgroundColor: 'rgba(22, 163, 74, 0.85)', hoverBackgroundColor: 'rgba(22, 163, 74, 1)' }
      ]},
      options: { 
        ...commonOptions, 
        plugins: { 
          legend: { position: 'top', ...commonOptions.plugins.legend },
          '3d-plugin': {
            enabled: true,
            depth: 30,
            angle: 45
          }
        } 
      }
    });

    const doughnutColors = [
      'rgba(22, 163, 74, 0.8)', 'rgba(14, 165, 233, 0.8)', 'rgba(249, 115, 22, 0.8)',
      'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(156, 163, 175, 0.8)'
    ];
    stateChart = new Chart(document.getElementById('stateChart').getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: doughnutColors }] },
      options: { ...commonOptions, scales: {}, plugins: { legend: { position: 'right', ...commonOptions.plugins.legend } } }
    });

    frRegChart = new Chart(document.getElementById('frRegChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['YTD', 'Last Year YTD'],
        datasets: [{
          label: 'Registrations',
          data: [],
          backgroundColor: ['rgba(14, 165, 233, 0.7)', 'rgba(22, 163, 74, 0.7)'],
        }]
      },
      options: { ...commonOptions, plugins: { legend: { display: false } } }
    });

    medicineCatChart = new Chart(document.getElementById('medicineCatChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: doughnutColors,
            }]
        },
        options: { ...commonOptions, scales: {}, plugins: { legend: { position: 'right', ...commonOptions.plugins.legend } } }
    });
  }

  function setupSlideNavigation() {
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let autoRotate = true;
    const totalSlides = slides.length;

    function goToSlide(index) {
      slides.forEach(s => s.classList.remove('active'));
      indicators.forEach(i => i.classList.remove('active'));
      slides[index].classList.add('active');
      indicators[index].classList.add('active');
      currentSlide = index;
      document.querySelector('.progress-bar').style.width = `${((index + 1) / totalSlides) * 100}%`;
    }

    const nextSlide = () => goToSlide((currentSlide + 1) % totalSlides);
    
    const rotateBadge = document.getElementById('rotateBadge');
    const toggleAutoRotate = (state) => {
      autoRotate = state;
      rotateBadge.classList.toggle('active', autoRotate);
      rotateBadge.textContent = autoRotate ? 'Auto-rotate ON' : 'Auto-rotate OFF';
    };

    rotateBadge.addEventListener('click', () => toggleAutoRotate(!autoRotate));
    
    indicators.forEach((ind, i) => ind.addEventListener('click', () => {
      toggleAutoRotate(false);
      goToSlide(i);
    }));

    setInterval(() => autoRotate && nextSlide(), 8000);

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); toggleAutoRotate(!autoRotate); }
      else if (e.key === 'ArrowRight') { toggleAutoRotate(false); nextSlide(); }
      else if (e.key === 'ArrowLeft') { toggleAutoRotate(false); goToSlide((currentSlide - 1 + totalSlides) % totalSlides); }
      else if (e.key.toLowerCase() === 'r') { toggleAutoRotate(true); goToSlide(0); }
      else if (e.key >= '1' && e.key <= '9') {
        toggleAutoRotate(false);
        goToSlide(parseInt(e.key) - 1);
      } else if (e.key === '0') {
        toggleAutoRotate(false);
        goToSlide(9);
      } else if (e.key === '-') {
        toggleAutoRotate(false);
        goToSlide(10);
      }
    });
    
    goToSlide(0); // Initialize first slide
  }

  function fetchAllData() {
    updateCategoryPerformance();
    updateStateFranchise();
    updateFranchiseStats();
    updateNewFranchiseYTDPerformance();
    updateTeamPunch();
    updateHighlights();
    updateSourceRevenue();
    updateWarehouseReport();
    updateStockDispatchReport();
    updateMedicineCategorySale();
    updateDailyPurchaseReport();
    updateYoyPurchaseComparison();
    updatePurchasePOReport();
    updateOdcStats();
    updateManufacturerBilling();
  }

  async function updateOdcStats() {
    const tableHead = document.getElementById('tbl-odc-stats-head');
    const tableBody = document.getElementById('tbl-odc-stats-body');

    // Set loading state
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading...</td></tr>';

    const data = await fetchData('https://posprod.posgmpl.com:3006/pos/api/v1/ims_reports/odc_stats/GODC0001');
    
    if (!data || data.status !== 1 || !data.result || data.result.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Error loading data.</td></tr>';
      return;
    }

    const odcData = data.result;
    const headers = Object.keys(odcData[0]);

    // Populate table headers
    tableHead.innerHTML = `<tr>${headers.map(h => `<th>${h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>`).join('')}</tr>`;

    // Populate table rows
    tableBody.innerHTML = odcData.map(row => `
      <tr>
        ${headers.map(header => `<td class="num">${typeof row[header] === 'number' ? formatNumber(row[header]) : row[header]}</td>`).join('')}
      </tr>
    `).join('');
  }

  async function updatePurchasePOReport() {
    // Set loading state for elements related to this update
    document.getElementById('po-total-companies').textContent = 'Loading...';
    document.getElementById('po-total-pos').textContent = 'Loading...';
    document.getElementById('po-total-amount').textContent = 'Loading...';
    const tableBody = document.getElementById('tbl-po-report');
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';

    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/purchasePOReport');
    if (!data || !data.success || !data.data) {
      document.getElementById('po-total-companies').textContent = 'Error';
      document.getElementById('po-total-pos').textContent = 'Error';
      document.getElementById('po-total-amount').textContent = 'Error';
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Error loading data.</td></tr>';
      return;
    }

    const reportData = data.data;

    const totalCompanies = reportData.length;
    const totalPOs = reportData.reduce((sum, item) => sum + item.PO_Generated_Count, 0);
    const totalAmount = reportData.reduce((sum, item) => sum + item.PO_Amount, 0);

    document.getElementById('po-total-companies').textContent = formatNumber(totalCompanies);
    document.getElementById('po-total-pos').textContent = formatNumber(totalPOs);
    document.getElementById('po-total-amount').textContent = formatCurrency(totalAmount);

    tableBody.innerHTML = reportData.map(item => `
      <tr>
        <td>${item.Company_Name}</td>
        <td class="num">${formatNumber(item.PO_Generated_Count)}</td>
        <td class="num">${formatCurrency(item.PO_Amount)}</td>
      </tr>
    `).join('');
  }

  async function updateYoyPurchaseComparison() {
    // Set loading state for elements related to this update
    document.getElementById('this-year-mtd').textContent = 'Loading...';
    document.getElementById('last-year-mtd').textContent = 'Loading...';
    document.getElementById('this-year-ytd').textContent = 'Loading...';
    document.getElementById('last-year-ytd').textContent = 'Loading...';

    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/yoySalesComparison');
    if (!data || !data.success || !data.data) {
      document.getElementById('this-year-mtd').textContent = 'Error';
      document.getElementById('last-year-mtd').textContent = 'Error';
      document.getElementById('this-year-ytd').textContent = 'Error';
      document.getElementById('last-year-ytd').textContent = 'Error';
      return;
    }

    const reportData = data.data[0];

    document.getElementById('this-year-mtd').textContent = formatCurrency(reportData.This_Year_MTD);
    document.getElementById('last-year-mtd').textContent = formatCurrency(reportData.Last_Year_MTD);
    document.getElementById('this-year-ytd').textContent = formatCurrency(reportData.This_Year_YTD);
    document.getElementById('last-year-ytd').textContent = formatCurrency(reportData.Last_Year_YTD);
  }

  async function updateDailyPurchaseReport() {
    // Set loading state for elements related to this update
    document.getElementById('ftd-amount').textContent = 'Loading...';
    document.getElementById('mtd-amount').textContent = 'Loading...';
    document.getElementById('ytd-amount').textContent = 'Loading...';

    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/dailySalesReport');
    if (!data || !data.success || !data.data) {
      document.getElementById('ftd-amount').textContent = 'Error';
      document.getElementById('mtd-amount').textContent = 'Error';
      document.getElementById('ytd-amount').textContent = 'Error';
      return;
    }

    const reportData = data.data[0];

    document.getElementById('ftd-amount').textContent = formatCurrency(reportData.FTD_Amount);
    document.getElementById('mtd-amount').textContent = formatCurrency(reportData.MTD_Amount);
    document.getElementById('ytd-amount').textContent = formatCurrency(reportData.YTD_Amount);
  }

  async function updateStockDispatchReport() {
    // Set loading state for elements related to this update
    document.getElementById('dispatch-count').textContent = 'Loading...';
    document.getElementById('stock-amount').textContent = 'Loading...';

    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/wlStockDispatchReport');
    if (!data || !data.success || !data.data || data.data.length === 0) {
      document.getElementById('dispatch-count').textContent = 'Error';
      document.getElementById('stock-amount').textContent = 'Error';
      return;
    }

    const reportData = data.data[0];

    document.getElementById('dispatch-count').textContent = formatNumber(reportData.Dispatch_Count);
    document.getElementById('stock-amount').textContent = formatCurrency(reportData.Stock_Amount);
  }

  async function updateMedicineCategorySale() {
    const data = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/medicineCategoryWiseSalesReport');
    if (!data || !data.success || !data.data) return;

    const medicineData = data.data;
    const half = Math.ceil(medicineData.length / 2);
    const firstHalf = medicineData.slice(0, half);
    const secondHalf = medicineData.slice(half);

    const tableBody1 = document.getElementById('tbl-medicine-category-1');
    tableBody1.innerHTML = firstHalf.map(item => `
        <tr>
            <td>${item.Category_Name}</td>
            <td class="num">${formatCurrency(item.Amount)}</td>
        </tr>
    `).join('');

    const tableBody2 = document.getElementById('tbl-medicine-category-2');
    tableBody2.innerHTML = secondHalf.map(item => `
        <tr>
            <td>${item.Category_Name}</td>
            <td class="num">${formatCurrency(item.Amount)}</td>
        </tr>
    `).join('');

    if (medicineCatChart) {
        medicineCatChart.data.labels = medicineData.map(item => item.Category_Name);
        medicineCatChart.data.datasets[0].data = medicineData.map(item => item.Amount);
        medicineCatChart.update();
    }
  }

  async function updateManufacturerBilling() {
    const tableBody = document.getElementById('tbl-manufacturer-billing');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';

    try {
      const result = await fetchData('https://prod.wmsgmpl.com:3010/api/v1/account_report/manufacturerWiseBilling');
      
      if (!result || !result.success || !result.data) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Error loading data.</td></tr>';
        return;
      }

      let billingData = result.data;

      if (billingData.length > 0) {
        tableBody.innerHTML = billingData.map(item => `
          <tr>
            <td>${item.Manufacturer_Name}</td>
            <td class="num">${formatCurrency(item.MTD_Amount)}</td>
            <td class="num">${formatCurrency(item.YTD_Amount)}</td>
          </tr>
        `).join('');
      } else {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data available.</td></tr>';
      }
    } catch (error) {
      console.error('Error fetching manufacturer billing data:', error);
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Error loading data: ${error.message}</td></tr>`;
    }
  }



  function autoScrollTable() {
    const tableWrap = document.querySelector('.table-wrap');
    if (!tableWrap) return;

    const tableBody = tableWrap.querySelector('tbody');
    if (!tableBody || tableBody.children.length === 0) return;

    // Clone rows for seamless looping
    const originalRows = Array.from(tableBody.children);
    originalRows.forEach(row => tableBody.appendChild(row.cloneNode(true)));

    let scrollTop = 0;
    const scrollAmount = 1; // pixels to scroll per interval
    const intervalTime = 50; // milliseconds

    function scroll() {
      scrollTop += scrollAmount;
      if (scrollTop >= tableBody.scrollHeight / 2) {
        scrollTop = 0;
      }
      tableWrap.scrollTop = scrollTop;
    }

    setInterval(scroll, intervalTime);
  }

  // --- Init ---
  updateClock();
  setInterval(updateClock, 1000);
  
  initializeCharts();
  setupSlideNavigation();
  fetchAllData();
  const ONE_AND_HALF_HOUR_MS = 90 * 60 * 1000; // 5,400,000 ms

  setInterval(fetchAllData, ONE_AND_HALF_HOUR_MS); // Refresh data every 1. 5 H
  autoScrollTable();
});
