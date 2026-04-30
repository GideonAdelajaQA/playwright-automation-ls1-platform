import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const targetUrl = (__ENV.TARGET_URL || __ENV.BASE_URL || 'https://d2dzzh5k55q3c6.cloudfront.net').replace(/\/+$/, '');
const scenario = (__ENV.SCENARIO || 'smoke').toLowerCase();
const thinkTimeSeconds = Number(__ENV.THINK_TIME_SECONDS || 1);
const routes = (__ENV.ROUTES || '/,/customer/dashboard,/customer/operations/purchase-orders,/customer/operations/deliveries')
  .split(',')
  .map(route => route.trim())
  .filter(Boolean);

const routeDuration = new Trend('ls1_route_duration', true);
const routeFailures = new Rate('ls1_route_failures');

const profiles = {
  smoke: {
    vus: 1,
    duration: '1m',
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<3000'],
      ls1_route_failures: ['rate<0.05'],
    },
  },
  load: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 10 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.03'],
      http_req_duration: ['p(95)<2500'],
      ls1_route_failures: ['rate<0.03'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 25 },
      { duration: '3m', target: 50 },
      { duration: '3m', target: 75 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.10'],
      http_req_duration: ['p(95)<5000'],
      ls1_route_failures: ['rate<0.10'],
    },
  },
};

export const options = profiles[scenario] || profiles.smoke;

function absoluteUrl(route) {
  if (/^https?:\/\//i.test(route)) {
    return route;
  }

  return `${targetUrl}${route.startsWith('/') ? route : `/${route}`}`;
}

function authHeaders() {
  const token = __ENV.LS1_TOKEN || __ENV.AUTH_TOKEN;

  if (!token) {
    return {};
  }

  return {
    Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`,
  };
}

export default function () {
  group('LS1 route availability', () => {
    for (const route of routes) {
      const response = http.get(absoluteUrl(route), {
        headers: {
          Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
          ...authHeaders(),
        },
        tags: { route },
      });

      routeDuration.add(response.timings.duration, { route });

      const ok = check(response, {
        [`${route} is not a server error`]: res => res.status < 500,
        [`${route} responds`]: res => res.status > 0,
      });

      routeFailures.add(!ok, { route });
      sleep(thinkTimeSeconds);
    }
  });
}

export function handleSummary(data) {
  return {
    'performance/results/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: [
      `\nLS1 k6 ${scenario} test complete`,
      `Target: ${targetUrl}`,
      `Routes: ${routes.join(', ')}`,
      `HTTP failures: ${(data.metrics.http_req_failed?.values.rate || 0) * 100}%`,
      `p95 duration: ${data.metrics.http_req_duration?.values['p(95)']} ms\n`,
    ].join('\n'),
  };
}
