import autocannon from "autocannon";

const target = process.env.LOAD_TEST_URL || "http://localhost:3000";
const route = process.env.LOAD_TEST_ROUTE || "/api/jobs?limit=20";
const duration = Number(process.env.LOAD_TEST_DURATION || "20");
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || "50");
const pipelining = Number(process.env.LOAD_TEST_PIPELINING || "1");

const instance = autocannon({
  url: `${target}${route}`,
  duration,
  connections,
  pipelining,
  headers: {
    Accept: "application/json",
  },
});

autocannon.track(instance, { renderProgressBar: true });

instance.on("done", (result) => {
  const summary = {
    requestsPerSec: result.requests.average,
    latencyP95: result.latency.p95,
    throughputBytesPerSec: result.throughput.average,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
  };

  console.log("\nLoad test summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (result.errors > 0 || result.timeouts > 0) {
    process.exitCode = 1;
  }
});