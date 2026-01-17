export default function getNormalizedMoney(entity: any): { amount: number; currency: string } | null {
    const nv = entity?.normalizedValue;
    if (nv?.moneyValue) {
        const units = parseInt(nv.moneyValue.units || "0", 10);
        const nanos = (nv.moneyValue.nanos || 0) / 1e9;
        return {
            amount: units + nanos,
            currency: nv.moneyValue.currencyCode || "USD",
        };
    }
    return null;
}