
// Minimal Node server (no external dependencies)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

let PORT = process.env.PORT || 3006;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- Dummy Data ----------
const data = {
  categoryPerformance: {
    labels: ['A+','A','B','C','D','E','Inactive'],
    ytdCurrent: [850,650,420,300,200,110,60],
    ytdLast:    [800,600,390,290,210,120,70]
  },
  newFranchise: { mtd: 37, ytd: 412, lastYtd: 392 },
  teamPunch: { inProcess: 53, started: 27, transferToFTD: 18 },
  ytdPerformance: { totalRegistered: 412, startedYTD: 306 },
  purchaseExcludingWS: { mtd: 1680000, ytd: 45200000 },
  highlights: [
    "No manual refresh needed — it’s all auto-magic every 30 seconds 🚀",
    
  ]
};

function sendJSON(res, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}
function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const abs = path.join(PUBLIC_DIR, safePath);
  fs.readFile(abs, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } else {
      const ext = path.extname(abs).toLowerCase();
      const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/category-performance') return sendJSON(res, data.categoryPerformance);
  if (req.url === '/api/state-franchise') {
    const options = {
      hostname: 'prod.wmsgmpl.com',
      port: 3010,
      path: '/api/v1/franchise/statewise_franchise',
      method: 'GET',
      rejectUnauthorized: false
    };
    const apiReq = https.get(options, apiRes => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const apiData = JSON.parse(body);
          const transformedData = apiData.data.map((item, index) => ({
            sr: index + 1,
            state: item.State,
            active: item.Active,
            inactive: item.Inactive
          }));
          sendJSON(res, transformedData);
        } catch (e) {
          console.error('Error parsing state-franchise API response:', e);
          sendJSON(res, []);
        }
      });
    });
    apiReq.on('error', e => {
      console.error('Error fetching state-franchise data:', e);
      sendJSON(res, []);
    });
    return;
  }
  if (req.url === '/api/fr-registration-stats') {
    const options = {
      hostname: 'prod.wmsgmpl.com',
      port: 3010,
      path: '/api/v1/franchise/getFrRegistrationStats',
      method: 'GET',
      rejectUnauthorized: false
    };
    const apiReq = https.get(options, apiRes => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const apiData = JSON.parse(body);
          sendJSON(res, apiData.data && apiData.data[0] ? apiData.data[0] : {});
        } catch (e) {
          console.error('Error parsing fr-registration-stats API response:', e);
          sendJSON(res, {});
        }
      });
    });
    apiReq.on('error', e => {
      console.error('Error fetching fr-registration-stats data:', e);
      sendJSON(res, {});
    });
    return;
  }
  if (req.url === '/api/team-punch')          return sendJSON(res, data.teamPunch);
  if (req.url === '/api/highlights')          return sendJSON(res, data.highlights);
  if (req.url === '/api/purchase-category-performance') {
    const options = {
      hostname: 'prod.wmsgmpl.com',
      port: 3010,
      path: '/api/v1/franchise/purchaseCategorywiseFrPerformance',
      method: 'GET',
      rejectUnauthorized: false
    };
    const apiReq = https.get(options, apiRes => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const apiData = JSON.parse(body);
          sendJSON(res, apiData.data);
        } catch (e) {
          console.error('Error parsing purchase-category-performance API response:', e);
          sendJSON(res, []);
        }
      });
    });
    apiReq.on('error', e => {
      console.error('Error fetching purchase-category-performance data:', e);
      sendJSON(res, []);
    });
    return;
  }
  if (req.url === '/api/new-franchise-ytd-performance') {
    const options = {
      hostname: 'prod.wmsgmpl.com',
      port: 3010,
      path: '/api/v1/franchise/getNewFrYTDPerformance',
      method: 'GET',
      rejectUnauthorized: false
    };
    const apiReq = https.get(options, apiRes => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const apiData = JSON.parse(body);
          sendJSON(res, apiData);
        } catch (e) {
          console.error('Error parsing new-franchise-ytd-performance API response:', e);
          sendJSON(res, {});
        }
      });
    });
    apiReq.on('error', e => {
      console.error('Error fetching new-franchise-ytd-performance data:', e);
      sendJSON(res, {});
    });
    return;
  }

  if (req.url === '/api/v1/account_report/whStockExpiryReport') {
    const options = {
      hostname: 'prod.wmsgmpl.com',
      port: 3010,
      path: '/api/v1/account_report/whStockExpiryReport',
      method: 'GET',
      rejectUnauthorized: false
    };
    const apiReq = https.get(options, apiRes => {
      let body = '';
      apiRes.on('data', chunk => body += chunk);
      apiRes.on('end', () => {
        try {
          const apiData = JSON.parse(body);
          sendJSON(res, apiData.data);
        } catch (e) {
          console.error('Error parsing whStockExpiryReport API response:', e);
          sendJSON(res, []);
        }
      });
    });
    apiReq.on('error', e => {
      console.error('Error fetching whStockExpiryReport data:', e);
      sendJSON(res, []);
    });
    return;
  }
  
  return serveStatic(req, res);
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`TV Dashboard (tables) on http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying another...`);
      startServer(port + 1);
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
