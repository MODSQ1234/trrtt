
export enum Side {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum Currency {
    ILS = 'ILS',
    USD = 'USD',
    OTHER = 'OTHER',
}

export enum Exchange {
    TASE = 'TASE',
    NASDAQ = 'NASDAQ',
    OTHER = 'OTHER',
}

export interface Trade {
    id: string;
    symbol: string;
    nameHe?: string;
    exchange?: Exchange;
    executedAt: string; // ISO 8601
    side: Side;
    quantity: number;
    price: number;
    fees?: number;
    tax?: number;
    currency: Currency;
    note?: string;
}

export type TradeFormData = Omit<Trade, 'id'>;
