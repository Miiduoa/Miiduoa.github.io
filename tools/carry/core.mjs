/** Pure amortization and end-of-month cash-flow model. Amounts in TWD. */
function requireNumber(value, name, lower = 0, upper = Infinity) {
  if (!Number.isFinite(value) || value < lower || value > upper) {
    throw new RangeError(name + ' must be between ' + lower + ' and ' + upper);
  }
}
export function payment(principal, annualRate, months) {
  requireNumber(principal, 'principal', 0, 1e10);
  requireNumber(annualRate, 'annualRate', 0, 1);
  if (!Number.isInteger(months) || months < 1 || months > 600) throw new RangeError('Invalid term');
  if (principal === 0) return 0;
  const r = annualRate / 12;
  return r === 0 ? principal / months : principal * r / (1 - Math.pow(1 + r, -months));
}
export function balance(principal, annualRate, term, paid) {
  const due = payment(principal, annualRate, term);
  if (!Number.isInteger(paid) || paid < 0) throw new RangeError('Invalid payment count');
  if (paid >= term || principal === 0) return 0;
  const r = annualRate / 12;
  const remaining = r === 0
    ? principal - due * paid
    : principal * Math.pow(1 + r, paid) - due * Math.expm1(paid * Math.log1p(r)) / r;
  return Math.max(0, remaining);
}
export function evaluate(input, annualReturn = input.annualReturn) {
  const { liquid, price, down, reserve, budget, apr, term, horizon } = input;
  for (const [name, value, upper] of [
    ['liquid', liquid, 1e10], ['price', price, 1e10], ['down', down, 1e10],
    ['reserve', reserve, 1e10], ['budget', budget, 1e8], ['apr', apr, 1],
  ]) requireNumber(value, name, 0, upper);
  requireNumber(annualReturn, 'annualReturn', -0.95, 2);
  if (!Number.isInteger(term) || term < 1 || term > 600) throw new RangeError('Invalid term');
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 360) throw new RangeError('Invalid horizon');
  if (down > price) throw new RangeError('Down payment exceeds price');
  if (liquid < price + reserve) throw new RangeError('Not enough liquid cash for both strategies and reserve');

  const principal = price - down;
  const monthly = payment(principal, apr, term);
  if (budget + 1e-7 < monthly) throw new RangeError('Monthly budget cannot cover the loan payment');
  const growth = Math.pow(1 + annualReturn, 1 / 12);
  let cashInvested = liquid - price - reserve;
  let creditInvested = liquid - down - reserve;
  const track = [];
  for (let m = 1; m <= horizon; m++) {
    const loanPaid = m <= term ? monthly : 0;
    cashInvested = cashInvested * growth + budget;
    creditInvested = creditInvested * growth + budget - loanPaid;
    if (m % 12 === 0 || m === horizon) {
      track.push({ month: m, cash: cashInvested + reserve,
        financed: creditInvested + reserve - balance(principal, apr, term, m) });
    }
  }
  const outstanding = balance(principal, apr, term, horizon);
  return {
    installment: monthly,
    borrowed: principal,
    loanInterest: monthly * term - principal,
    outstanding,
    cashWealth: cashInvested + reserve,
    financedWealth: creditInvested + reserve - outstanding,
    difference: creditInvested - cashInvested - outstanding,
    effectiveBorrowingRate: Math.pow(1 + apr / 12, 12) - 1,
    track,
  };
}
export function scenarioTable(input, returns = [-0.15, 0, 0.04, 0.08]) {
  return returns.map(rate => ({ rate, ...evaluate(input, rate) }));
}
