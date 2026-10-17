export function rentalDays(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return 0;
  for (const value of [start, end]) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      return 0;
  }
  const days =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86400000;
  return Number.isInteger(days) && days > 0 ? days : 0;
}

export function estimatePrice(cars, days) {
  return (
    cars.reduce(
      (total, car) =>
        total +
        Math.round(Math.round(Number(car.daily_rate) * 100) * days * (days >= 7 ? 90 : 100) / 100),
      0,
    ) / 100
  );
}

export function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
