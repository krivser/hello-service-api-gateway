const prometheus = require('prom-client')

const METRICS_REQUEST_COUNT = new prometheus.Counter({
  name: 'hello_service:request_count',
  help: 'Application Request Count',
  labelNames: ['method', 'endpoint', 'status_code']
})

const METRICS_ERROR_COUNT = new prometheus.Counter({
  name: 'hello_service:error_count',
  help: 'Application Error Count',
  labelNames: ['method', 'endpoint', 'status_code']
})

const METRICS_REQUEST_LATENCY = new prometheus.Histogram({
  name: 'hello_service:latency',
  help: 'Latency of HTTP requests in ms',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

module.exports = {
  requests: METRICS_REQUEST_COUNT,
  errors: METRICS_ERROR_COUNT,
  latency: METRICS_REQUEST_LATENCY
}