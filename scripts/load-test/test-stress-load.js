import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics
const homepageTrend = new Trend('homepage_response_time');
const bundleTrend = new Trend('bundle_response_time');
const successRate = new Rate('successful_requests');
const errorCount = new Counter('total_http_errors');

export const options = {
  stages: [
    { duration: '5s', target: 10 },   // Warm-up to 10 VUs
    { duration: '15s', target: 30 },  // Sustained heavy load (30 VUs)
    { duration: '10s', target: 60 },  // Peak Spike load (60 VUs)
    { duration: '5s', target: 0 },    // Ramp-down & cooldown
  ],
  thresholds: {
    // 95% of requests must complete under 800ms
    http_req_duration: ['p(95)<800'],
    // Less than 5% total failure rate
    http_req_failed: ['rate<0.05'],
    // At least 95% successful requests
    'successful_requests': ['rate>0.95'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Visit Storefront Homepage
  group('1. Storefront Landing', function () {
    const homeRes = http.get(`${BASE_URL}/`, {
      tags: { name: 'Homepage' },
      headers: { 'Accept': 'text/html' }
    });

    homepageTrend.add(homeRes.timings.duration);
    const homeOk = check(homeRes, {
      'Homepage status 200': (r) => r.status === 200,
      'Homepage contains HTML content': (r) => r.body && r.body.length > 500,
    });

    if (homeOk) {
      successRate.add(true);
    } else {
      successRate.add(false);
      errorCount.add(1);
    }
  });

  // Short realistic pause as user parses HTML
  sleep(0.1);

  // 2. Fetch Core Assets (CSS & Bundle)
  group('2. Core Assets Download', function () {
    const bundleRes = http.get(`${BASE_URL}/dist/store.bundle.js`, {
      tags: { name: 'StoreBundle' }
    });

    bundleTrend.add(bundleRes.timings.duration);
    const bundleOk = check(bundleRes, {
      'Bundle status 200 or 304': (r) => r.status === 200 || r.status === 304,
    });

    if (bundleOk) {
      successRate.add(true);
    } else {
      successRate.add(false);
      errorCount.add(1);
    }
  });

  // Short pause before next user action
  sleep(0.2);
}

// Generate Standalone HTML Report at end of test
export function handleSummary(data) {
  const reqTotal = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqRate = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(1) : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0;
  const avg = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const max = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max.toFixed(2) : 0;
  const failRate = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const vusMax = data.metrics.vus_max ? data.metrics.vus_max.values.value : 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>k6 Load Test Security & Performance Report</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --accent: #00F2FF;
      --success: #10b981;
      --danger: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 30px 20px;
      line-height: 1.5;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { font-size: 24px; font-weight: 800; color: #fff; margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin-top: 5px; }
    .badge {
      background: rgba(0, 242, 255, 0.1);
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .metric-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .metric-value { font-size: 28px; font-weight: 800; margin-top: 8px; color: #fff; }
    .metric-value.highlight { color: var(--accent); }
    .metric-value.good { color: var(--success); }
    .metric-value.bad { color: var(--danger); }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td { padding: 14px 18px; text-align: left; }
    th { background: #1f2937; color: var(--text-muted); font-size: 12px; text-transform: uppercase; }
    td { border-bottom: 1px solid var(--border); font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .footer { text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">⚡ k6 Load & Concurrency Report</div>
        <div class="subtitle">Storefront Stress Testing & Resilience Assessment (${new Date().toLocaleString()})</div>
      </div>
      <span class="badge">VUs Max: ${vusMax}</span>
    </div>

    <div class="grid">
      <div class="card">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value highlight">${reqTotal}</div>
      </div>
      <div class="card">
        <div class="metric-label">Requests / Sec</div>
        <div class="metric-value">${reqRate} <span style="font-size: 14px; color: var(--text-muted)">req/s</span></div>
      </div>
      <div class="card">
        <div class="metric-label">Latency (p95)</div>
        <div class="metric-value ${p95 < 500 ? 'good' : 'bad'}">${p95} <span style="font-size: 14px; color: var(--text-muted)">ms</span></div>
      </div>
      <div class="card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value ${failRate < 1 ? 'good' : 'bad'}">${failRate}%</div>
      </div>
    </div>

    <table style="margin-bottom: 25px;">
      <thead>
        <tr>
          <th>Performance Metric</th>
          <th>Measured Value</th>
          <th>Target Threshold</th>
          <th>Defense Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>p(95) Response Time</strong></td>
          <td>${p95} ms</td>
          <td>&lt; 800 ms</td>
          <td><span style="color: ${p95 < 800 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${p95 < 800 ? '✅ PASSED' : '❌ FAILED'}</span></td>
        </tr>
        <tr>
          <td><strong>Average Response Time</strong></td>
          <td>${avg} ms</td>
          <td>&lt; 400 ms</td>
          <td><span style="color: ${avg < 400 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${avg < 400 ? '✅ PASSED' : '❌ FAILED'}</span></td>
        </tr>
        <tr>
          <td><strong>Max Response Time</strong></td>
          <td>${max} ms</td>
          <td>-</td>
          <td>-</td>
        </tr>
        <tr>
          <td><strong>Failed Request Rate</strong></td>
          <td>${failRate}%</td>
          <td>&lt; 5.0%</td>
          <td><span style="color: ${failRate < 5.0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${failRate < 5.0 ? '✅ PASSED' : '❌ FAILED'}</span></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by Antigravity k6 Full-Option Test Suite
    </div>
  </div>
</body>
</html>`;

  return {
    'load-test-report.html': html,
  };
}
