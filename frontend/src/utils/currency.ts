export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("MAD", "DH")
    .replace(" MAD", " DH")
    .replace("MAD ", "DH ")
    .trim();
};
