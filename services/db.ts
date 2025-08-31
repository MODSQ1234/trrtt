import React, { useState, useEffect, useCallback } from 'react';
import type { Trade } from '../types';
// Fix: Correctly import Dexie and the `Table` type to resolve typing issues with subclassing.
import Dexie, { type Table } from 'dexie';

class TradingJournalDB extends Dexie {
    trades!: Table<Trade, string>;

    constructor() {
        super('TradingJournalDB');
        this.version(1).stores({
            trades: 'id, symbol, executedAt, side, currency',
        });
    }
}

export const db = new TradingJournalDB();

// React Hook for interacting with the trades table
export const useTrades = () => {
    const [trades, setTrades] = useState<Trade[]>([]);

    const fetchTrades = useCallback(async () => {
        try {
            const allTrades = await db.trades.orderBy('executedAt').reverse().toArray();
            setTrades(allTrades);
        } catch (error) {
            console.error("Failed to fetch trades:", error);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const addTrade = async (tradeData: Omit<Trade, 'id'>) => {
        try {
            const uuidv4 = (window as any).uuidv4;
            const newTrade = { ...tradeData, id: uuidv4() };
            await db.trades.add(newTrade);
            await fetchTrades();
        } catch (error) {
            console.error("Failed to add trade:", error);
        }
    };
    
    const bulkAddTrades = async (newTrades: Omit<Trade, 'id'>[]) => {
        try {
            const uuidv4 = (window as any).uuidv4;
            const tradesWithIds = newTrades.map(t => ({ ...t, id: uuidv4() }));
            await db.trades.bulkAdd(tradesWithIds);
            await fetchTrades();
            return tradesWithIds.length;
        } catch (error) {
            console.error("Failed to bulk add trades:", error);
            return 0;
        }
    };

    const updateTrade = async (id: string, updates: Partial<Trade>) => {
        try {
            await db.trades.update(id, updates);
            await fetchTrades();
        } catch (error) {
            console.error("Failed to update trade:", error);
        }
    };

    const deleteTrade = async (id: string) => {
        try {
            await db.trades.delete(id);
            await fetchTrades();
        } catch (error) {
            console.error("Failed to delete trade:", error);
        }
    };

    return { trades, addTrade, updateTrade, deleteTrade, bulkAddTrades, refreshTrades: fetchTrades };
};
