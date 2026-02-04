import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2] ?? 'perf-report.json';
const fullPath = path.resolve(process.cwd(), reportPath);

if (!fs.existsSync(fullPath)) {
  console.warn(`perf report not found at ${fullPath}`);
  process.exit(0);
}

const raw = fs.readFileSync(fullPath, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.warn('Unable to parse perf report JSON:', err instanceof Error ? err.message : String(err));
  process.exit(0);
}

const tests = [];
function collect(obj) {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(collect);
    return;
  }
  const { name, duration, time } = obj;
  if (typeof name === 'string' && (typeof duration === 'number' || typeof time === 'number')) {
    tests.push({ name, durationMs: typeof duration === 'number' ? duration : time });
  }
  Object.values(obj).forEach(collect);
}
collect(data);

const interesting = tests.filter((t) =>
  /fuzz|runtime/i.test(t.name)
);

const totals = {
  totalTests: tests.length,
  runtimeMs: typeof data.duration === 'number' ? data.duration : undefined,
};

console.log('Perf report summary');
console.log('===================');
console.log(`Report file: ${fullPath}`);
console.log(`Total discovered tests: ${totals.totalTests}`);
if (totals.runtimeMs !== undefined) {
  console.log(`Reported suite runtime: ${totals.runtimeMs}ms`);
}
if (interesting.length === 0) {
  console.log('No fuzz/runtime tests found in report');
  process.exit(0);
}

interesting.forEach((test) => {
  console.log(`- ${test.name}: ${test.durationMs}ms`);
});

const validation = interesting.find((t) => /validate|fuzz/i.test(t.name));
if (validation) {
  console.log(`validation_time_ms=${validation.durationMs}`);
}
const runtime = interesting.find((t) => /runtime/i.test(t.name));
if (runtime) {
  console.log(`runtime_latency_ms=${runtime.durationMs}`);
}
