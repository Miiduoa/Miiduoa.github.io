/** M/M/c steady-state Erlang C. Rates are jobs/hour, duration is minutes. */
function bounded(value, key, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(key + ' out of range');
}
export function queue({ arrival, serviceMinutes, servers, targetMinutes = 5 }) {
  bounded(arrival, 'arrival', 0, 5000);
  bounded(serviceMinutes, 'serviceMinutes', .5, 60);
  bounded(targetMinutes, 'targetMinutes', .1, 60);
  if (!Number.isInteger(servers) || servers < 1 || servers > 120) throw new RangeError('servers out of range');
  const serviceRate = 60 / serviceMinutes;
  const traffic = arrival / serviceRate;
  const utilization = traffic / servers;
  if (arrival === 0) return { stable: true, utilization: 0, waitProbability: 0,
    meanWaitMinutes: 0, overTargetProbability: 0, meanTotalMinutes: serviceMinutes };
  if (utilization >= 1) return { stable: false, utilization, waitProbability: 1,
    meanWaitMinutes: Infinity, overTargetProbability: 1, meanTotalMinutes: Infinity };
  // Erlang B in a recurrence: avoids overflowing a^c and factorials.
  let block = 1;
  for (let n = 1; n <= servers; n++) block = traffic * block / (n + traffic * block);
  const waitProbability = block / (1 - utilization + utilization * block);
  const spareCapacity = servers * serviceRate - arrival;
  const meanWaitMinutes = waitProbability / spareCapacity * 60;
  const overTargetProbability = waitProbability * Math.exp(-spareCapacity * targetMinutes / 60);
  return { stable: true, utilization, waitProbability,
    meanWaitMinutes, overTargetProbability, meanTotalMinutes: meanWaitMinutes + serviceMinutes };
}
export function recommend({ arrival, serviceMinutes, targetMinutes, maxTail = .1, maxServers = 120 }) {
  bounded(maxTail, 'maxTail', 0, 1);
  if (!Number.isInteger(maxServers) || maxServers < 1 || maxServers > 120) throw new RangeError('maxServers out of range');
  for (let servers = 1; servers <= maxServers; servers++) {
    const result = queue({ arrival, serviceMinutes, servers, targetMinutes });
    if (result.stable && result.overTargetProbability <= maxTail) return { servers, ...result };
  }
  return null;
}
export function overview({ arrival, serviceMinutes, servers, targetMinutes, surge }) {
  bounded(surge, 'surge', 1, 3);
  return {
    regular: queue({ arrival, serviceMinutes, servers, targetMinutes }),
    surge: queue({ arrival: arrival * surge, serviceMinutes, servers, targetMinutes }),
    regularRecommendation: recommend({ arrival, serviceMinutes, targetMinutes }),
    surgeRecommendation: recommend({ arrival: arrival * surge, serviceMinutes, targetMinutes }),
  };
}
