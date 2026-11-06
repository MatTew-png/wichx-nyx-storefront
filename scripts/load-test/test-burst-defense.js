import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics to track defense capabilities
export const blockedByRateLimit = new Counter('blocked_by_ratelimit');
export const passedRateLimit = new Counter('passed_ratelimit');
export const defenseRate = new Rate('rate_limit_defense_rate');

export const options = {
  scenarios: {
    // Scenario: 1 Virtual User firing 15 requests in rapid burst (anti-brute-force test)
    burst_attack_simulation: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 15,
      maxDuration: '20s',
    },
  },
  thresholds: {
    // We expect at least some requests to be successfully rate-limited (blocked with 429)
    'blocked_by_ratelimit': ['count>0'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  const url = `${BASE_URL}/api/verify-slip`;
  const payload = JSON.stringify({
    amount: 199.00,
    transRef: `BURST-TEST-${Date.now()}-${__ITER}`,
    userId: 'test-user-k6'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-burst-tester/1.0',
    },
  };

  const res = http.post(url, payload, params);

  const isRateLimited = res.status === 429;
  const isAllowed = res.status === 200 || res.status === 400 || res.status === 500;

  if (isRateLimited) {
    blockedByRateLimit.add(1);
    defenseRate.add(true);
  } else {
    passedRateLimit.add(1);
    defenseRate.add(false);
  }

  check(res, {
    'Status is 200/400 (Allowed window) or 429 (Blocked)': (r) => r.status === 200 || r.status === 400 || r.status === 429 || r.status === 500,
    'Rate limit headers present when blocked (429)': (r) => {
      if (r.status === 429) {
        return r.headers['Retry-After'] !== undefined || r.headers['retry-after'] !== undefined;
      }
      return true;
    },
  });

  // Rapid burst: minimal delay (0.05s) between requests
  sleep(0.05);
}
