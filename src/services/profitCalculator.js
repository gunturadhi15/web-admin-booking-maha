/**
 * Domain Service: Perhitungan Keuntungan (Dasbor Untung Usaha)
 * Mengacu pada Aturan Perhitungan Keuntungan PRD Bagian 9
 */

/**
 * Menghitung pendapatan bersih dari sebuah pesanan
 * Formula: subtotal - diskon + pendapatan tambahan - refund
 */
export function calculateOrderNetIncome(order) {
  const subtotal = Number(order.subtotal_amount || 0);
  const discount = Number(order.discount_amount || 0);
  const additional = Number(order.additional_income_amount || 0);
  const refund = Number(order.refund_amount || 0);

  // Jika pesanan dibatalkan, pendapatan aktif dihitung 0
  if (order.status === 'Dibatalkan') {
    return 0;
  }

  return Math.max(0, subtotal - discount + additional - refund);
}

/**
 * Menghitung total modal dan biaya langsung dari daftar komponen biaya
 */
export function calculateOrderTotalCost(costs = []) {
  return costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

/**
 * Menghitung laba kotor dari sebuah pesanan
 * Formula: Pendapatan Bersih - Total Modal/Biaya Langsung
 */
export function calculateOrderGrossProfit(order, costs = []) {
  if (order.status === 'Dibatalkan') {
    return 0;
  }
  const netIncome = calculateOrderNetIncome(order);
  const totalCost = calculateOrderTotalCost(costs);
  return netIncome - totalCost;
}

/**
 * Menghitung persentase margin laba kotor pesanan
 */
export function calculateOrderProfitMargin(order, costs = []) {
  const netIncome = calculateOrderNetIncome(order);
  if (netIncome <= 0) return 0;
  const grossProfit = calculateOrderGrossProfit(order, costs);
  return Math.round((grossProfit / netIncome) * 100);
}

/**
 * Menghitung ringkasan performa finansial keseluruhan untuk periode tertentu
 */
export function calculatePeriodSummary(orders = [], allCosts = [], operationalExpenses = []) {
  let totalRevenue = 0;
  let totalOrderCosts = 0;
  let orderCount = orders.length;
  let completedCount = 0;

  orders.forEach(order => {
    if (order.status !== 'Dibatalkan') {
      totalRevenue += calculateOrderNetIncome(order);
      if (order.status === 'Selesai') completedCount++;
    }
  });

  allCosts.forEach(cost => {
    totalOrderCosts += Number(cost.amount || 0);
  });

  const totalOperational = operationalExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const grossProfit = totalRevenue - totalOrderCosts;
  const netProfit = grossProfit - totalOperational;
  const netMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue,
    totalOrderCosts,
    totalOperational,
    grossProfit,
    netProfit,
    netMargin,
    orderCount,
    completedCount
  };
}

/**
 * Helper format rupiah
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}
