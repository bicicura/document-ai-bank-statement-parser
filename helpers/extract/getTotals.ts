export default function getTotals(transactions: any) {
    let positive = 0
    let negative = 0
    let net = 0

    for (const tx of transactions) {
        net += tx.amount;
        if (tx.amount > 0) {
            positive += tx.amount;
        } else {
            negative += tx.amount;
        }
    }

    return {
        positive: Math.round(positive * 100) / 100,
        negative: Math.round(negative * 100) / 100,
        net: Math.round(net * 100) / 100
    }
}