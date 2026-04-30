# LS1 Performance and Stress Tests

This folder contains HTTP-level performance tests for LS1 using k6 and Apache JMeter.

The tests are safe defaults for repeatable performance runs: they exercise LS1 route availability and response time without creating purchase orders, sales orders, deliveries, or OTP traffic. Keep the Playwright suite for end-to-end business-flow correctness, then use these tests to measure latency, throughput, and error rate under load.

## Tools

- k6: install from <https://grafana.com/docs/k6/latest/set-up/install-k6/>
- JMeter: install from <https://jmeter.apache.org/download_jmeter.cgi>

Both tools must be available on your `PATH`.

## k6

Run the default smoke test:

```bash
npm run perf:k6:smoke
```

Run load or stress:

```bash
npm run perf:k6:load
npm run perf:k6:stress
```

Useful overrides:

```bash
k6 run -e SCENARIO=stress -e TARGET_URL=https://ls1dev.web.app performance/k6/ls1-http.js
k6 run -e ROUTES="/,/customer/dashboard,/customer/operations/purchase-orders" performance/k6/ls1-http.js
k6 run -e THINK_TIME_SECONDS=2 performance/k6/ls1-http.js
```

Outputs:

- `performance/results/k6-summary.json`

## JMeter

Run the default smoke test:

```bash
npm run perf:jmeter:smoke
```

Run load or stress:

```bash
npm run perf:jmeter:load
npm run perf:jmeter:stress
```

Useful overrides:

```bash
jmeter -n -t performance/jmeter/ls1-http.jmx -JTARGET_HOST=ls1dev.web.app -JTHREADS=25 -JRAMP_UP=120 -JDURATION=600 -l performance/results/custom.jtl
jmeter -n -t performance/jmeter/ls1-http.jmx -JROUTE3=/customer/operations/purchase-orders -JTHINK_TIME_MS=2000 -l performance/results/routes.jtl
```

Outputs:

- `performance/results/jmeter-smoke.jtl`
- `performance/results/jmeter-load.jtl`
- `performance/results/jmeter-stress.jtl`

To generate an HTML dashboard after a JMeter run:

```bash
jmeter -g performance/results/jmeter-load.jtl -o performance/results/jmeter-load-report
```

The output report folder must not already exist.

## Profiles

| Profile | k6 shape | JMeter defaults | Purpose |
| --- | --- | --- | --- |
| smoke | 1 VU for 1 minute | 1 thread for 60 seconds | Verify the target and routes are reachable |
| load | 10 VUs steady after ramp | 10 threads for 5 minutes | Baseline normal expected usage |
| stress | Steps up to 75 VUs | 50 threads for 10 minutes | Find degradation and error points |

## Recommended Workflow

1. Run `npm run perf:k6:smoke` and `npm run perf:jmeter:smoke`.
2. Confirm the routes and target domain are correct.
3. Run load tests against a non-production environment first.
4. Run stress tests only during an approved test window.
5. Compare p95 latency, request rate, and error rate between runs.

## Adding Authenticated API Tests

These starter tests hit web routes because the repo currently contains UI selectors, not LS1 API contracts. Once LS1 API endpoints are confirmed, add authenticated API samplers for login, PO creation, SO approval, shipment creation, and POD completion.

For k6, add API calls to `performance/k6/ls1-http.js` and pass an auth token with:

```bash
k6 run -e LS1_TOKEN=your-token performance/k6/ls1-http.js
```

For JMeter, add an HTTP Header Manager entry for `Authorization: Bearer ${__P(LS1_TOKEN,)}` or add a login sampler with a JSON extractor for the returned token.
