
import React, { useState, useMemo } from 'react';
import type { Trade, TradeFormData } from '../types';
import { Side, Currency, Exchange } from '../types';
import { useTrades } from '../services/db';
import { formatDateTime, formatCurrency, calculateNetAmount, cn } from '../lib/utils';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, DropdownMenu, DropdownMenuItem, Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, Select, PlusCircleIcon, Trash2Icon, EditIcon, ChevronUpIcon, ChevronDownIcon } from './ui';

interface TradesPageProps {
    trades: Trade[];
    addTrade: (trade: TradeFormData) => Promise<void>;
    updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
    deleteTrade: (id: string) => Promise<void>;
}

const TradesPage = ({ trades, addTrade, updateTrade, deleteTrade }: TradesPageProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: 'asc' | 'desc' }>({ key: 'executedAt', direction: 'desc' });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

    const filteredTrades = useMemo(() => {
        return trades
            .filter(trade => trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined || bValue === undefined) return 0;

                let comparison = 0;
                if (aValue > bValue) {
                    comparison = 1;
                } else if (aValue < bValue) {
                    comparison = -1;
                }
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
    }, [trades, searchTerm, sortConfig]);

    const handleSort = (key: keyof Trade) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleAddNew = () => {
        setSelectedTrade(null);
        setIsFormOpen(true);
    };

    const handleEdit = (trade: Trade) => {
        setSelectedTrade(trade);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (trade: Trade) => {
        setSelectedTrade(trade);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedTrade) {
            deleteTrade(selectedTrade.id);
            setIsDeleteConfirmOpen(false);
            setSelectedTrade(null);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">העסקאות שלי</h1>
            <TradesSummary trades={trades} />
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-xl">רשימת עסקאות</CardTitle>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Input
                            placeholder="חפש לפי סימבול..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64"
                        />
                         <Button onClick={handleAddNew} className="flex-shrink-0">
                            <PlusCircleIcon className="ms-2 h-4 w-4" />
                            הוספת עסקה
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <TradesTable trades={filteredTrades} onSort={handleSort} sortConfig={sortConfig} onEdit={handleEdit} onDelete={handleDeleteRequest} />
                </CardContent>
            </Card>

            <TradeFormDialog 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                trade={selectedTrade} 
                onSave={selectedTrade ? (data) => updateTrade(selectedTrade.id, data) : addTrade} 
            />

            <DeleteConfirmDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                tradeSymbol={selectedTrade?.symbol || ''}
            />
        </div>
    );
};


const TradesSummary = ({ trades }: { trades: Trade[] }) => {
    const summary = useMemo(() => {
        return trades.reduce((acc, trade) => {
            if (trade.currency === Currency.ILS) {
                const grossAmount = trade.quantity * trade.price;
                const totalDeductions = (trade.fees || 0) + (trade.tax || 0);

                if (trade.side === Side.BUY) {
                    acc.totalBuys += grossAmount;
                } else {
                    acc.totalSells += grossAmount;
                }
                acc.totalFeesTax += totalDeductions;
            }
            return acc;
        }, { totalBuys: 0, totalSells: 0, totalFeesTax: 0 });
    }, [trades]);

    const netTrades = summary.totalSells - summary.totalBuys - summary.totalFeesTax;

    const summaryCards = [
        { title: 'סה"כ מכירות (ברוטו)', value: summary.totalSells, color: 'text-green-500' },
        { title: 'סה"כ קניות (ברוטו)', value: summary.totalBuys, color: 'text-red-500' },
        { title: 'סה"כ עמלות ומס', value: summary.totalFeesTax, color: 'text-yellow-500' },
        { title: 'סה"כ נטו (מכירות פחות קניות ועמלות)', value: netTrades, color: netTrades >= 0 ? 'text-green-500' : 'text-red-500' },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(card => (
                <Card key={card.title}>
                    <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value, Currency.ILS)}</p>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
};

interface TradesTableProps {
    trades: Trade[];
    onSort: (key: keyof Trade) => void;
    sortConfig: { key: keyof Trade; direction: 'asc' | 'desc' };
    onEdit: (trade: Trade) => void;
    onDelete: (trade: Trade) => void;
}
const TradesTable = ({ trades, onSort, sortConfig, onEdit, onDelete }: TradesTableProps) => {
    const columns: { key: keyof Trade; label: string; sortable: boolean }[] = [
        { key: 'executedAt', label: 'תאריך ושעה', sortable: true },
        { key: 'symbol', label: 'סימבול', sortable: true },
        { key: 'side', label: 'צד', sortable: true },
        { key: 'quantity', label: 'כמות', sortable: false },
        { key: 'price', label: 'מחיר ליח׳', sortable: false },
        { key: 'fees', label: 'עמלות', sortable: false },
        { key: 'tax', label: 'מס', sortable: false },
    ];

    if (!trades.length) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">לא נמצאו עסקאות.</p>
                <p className="text-muted-foreground">אפשר להתחיל על ידי הוספת עסקה חדשה או ייבוא מקובץ CSV.</p>
            </div>
        );
    }

    const SortIndicator = ({ columnKey }: { columnKey: keyof Trade }) => {
        if (sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
                <thead className="border-b">
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} className="p-4 font-medium">
                                {col.sortable ? (
                                    <button onClick={() => onSort(col.key)} className="flex items-center gap-1 hover:text-foreground/80">
                                        {col.label}
                                        <SortIndicator columnKey={col.key} />
                                    </button>
                                ) : (
                                    col.label
                                )}
                            </th>
                        ))}
                        <th className="p-4 font-medium">שווי פעולה (נטו)</th>
                        <th className="p-4 font-medium">הערה</th>
                        <th className="p-4 font-medium">פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    {trades.map(trade => (
                        <tr key={trade.id} className="border-b hover:bg-muted/50">
                            <td className="p-4 whitespace-nowrap">{formatDateTime(trade.executedAt)}</td>
                            <td className="p-4 font-medium">{trade.symbol}</td>
                            <td className={`p-4 font-semibold ${trade.side === Side.BUY ? 'text-red-500' : 'text-green-500'}`}>
                                {trade.side === Side.BUY ? 'קנייה' : 'מכירה'}
                            </td>
                            <td className="p-4">{trade.quantity}</td>
                            <td className="p-4">{formatCurrency(trade.price, trade.currency)}</td>
                            <td className="p-4">{formatCurrency(trade.fees || 0, trade.currency)}</td>
                            <td className="p-4">{formatCurrency(trade.tax || 0, trade.currency)}</td>
                            <td className="p-4 font-bold">{formatCurrency(calculateNetAmount(trade), trade.currency)}</td>
                            <td className="p-4 max-w-xs truncate">{trade.note}</td>
                            <td className="p-4">
                                <DropdownMenu>
                                    <DropdownMenuItem onClick={() => onEdit(trade)}><EditIcon className="h-4 w-4" /> עריכה</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(trade)} className="text-destructive"><Trash2Icon className="h-4 w-4" /> מחיקה</DropdownMenuItem>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


interface TradeFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    trade: Trade | null;
    onSave: (data: any) => void;
}
const TradeFormDialog = ({ isOpen, onClose, trade, onSave }: TradeFormDialogProps) => {
    const [formData, setFormData] = useState<any>({});
    const [errors, setErrors] = useState<any>({});

    React.useEffect(() => {
        if (isOpen) {
            const now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);

            setFormData(trade ? {
                ...trade,
                executedAt: trade.executedAt.slice(0, 16)
            } : {
                symbol: '',
                side: Side.BUY,
                quantity: '',
                price: '',
                fees: '0',
                tax: '0',
                currency: Currency.ILS,
                note: '',
                executedAt: now.toISOString().slice(0, 16),
            });
            setErrors({});
        }
    }, [isOpen, trade]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const newErrors: any = {};
        if (!formData.symbol) newErrors.symbol = 'סימבול הוא שדה חובה';
        if (!formData.executedAt) newErrors.executedAt = 'תאריך הוא שדה חובה';
        if (Number(formData.quantity) <= 0) newErrors.quantity = 'כמות חייבת להיות גדולה מ-0';
        if (Number(formData.price) <= 0) newErrors.price = 'מחיר חייב להיות גדול מ-0';
        if (Number(formData.fees) < 0) newErrors.fees = 'עמלות לא יכולות להיות שליליות';
        if (Number(formData.tax) < 0) newErrors.tax = 'מס לא יכול להיות שלילי';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            const submissionData = {
                ...formData,
                executedAt: new Date(formData.executedAt).toISOString(),
                quantity: Number(formData.quantity),
                price: Number(formData.price),
                fees: Number(formData.fees || 0),
                tax: Number(formData.tax || 0),
            };
            onSave(submissionData);
            onClose();
        }
    };

    const renderError = (field: string) => errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>;
    
    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>{trade ? 'עריכת עסקה' : 'הוספת עסקה חדשה'}</DialogTitle>
            </DialogHeader>
            <DialogContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">סימבול</label>
                        <Input name="symbol" value={formData.symbol || ''} onChange={handleChange} />
                        {renderError('symbol')}
                    </div>
                     <div>
                        <label className="text-sm font-medium">תאריך ושעה</label>
                        <Input type="datetime-local" name="executedAt" value={formData.executedAt || ''} onChange={handleChange} />
                        {renderError('executedAt')}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">צד</label>
                        <Select name="side" value={formData.side || ''} onChange={handleChange}>
                            <option value={Side.BUY}>קנייה</option>
                            <option value={Side.SELL}>מכירה</option>
                        </Select>
                    </div>
                     <div>
                        <label className="text-sm font-medium">מטבע</label>
                        <Select name="currency" value={formData.currency || ''} onChange={handleChange}>
                            <option value={Currency.ILS}>ש"ח</option>
                            <option value={Currency.USD}>דולר</option>
                            <option value={Currency.OTHER}>אחר</option>
                        </Select>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">כמות</label>
                        <Input type="number" name="quantity" value={formData.quantity || ''} onChange={handleChange} />
                        {renderError('quantity')}
                    </div>
                     <div>
                        <label className="text-sm font-medium">מחיר</label>
                        <Input type="number" name="price" value={formData.price || ''} onChange={handleChange} />
                        {renderError('price')}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">עמלות</label>
                        <Input type="number" name="fees" value={formData.fees || ''} onChange={handleChange} />
                        {renderError('fees')}
                    </div>
                     <div>
                        <label className="text-sm font-medium">מס</label>
                        <Input type="number" name="tax" value={formData.tax || ''} onChange={handleChange} />
                        {renderError('tax')}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">הערה</label>
                    <Input name="note" value={formData.note || ''} onChange={handleChange} />
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>ביטול</Button>
                <Button onClick={handleSubmit}>שמירה</Button>
            </DialogFooter>
        </Dialog>
    );
};


interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tradeSymbol: string;
}
const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, tradeSymbol }: DeleteConfirmDialogProps) => (
    <Dialog isOpen={isOpen} onClose={onClose}>
        <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
        </DialogHeader>
        <DialogContent>
            <p>האם אתה בטוח שברצונך למחוק את העסקה עבור <strong>{tradeSymbol}</strong>? לא ניתן לשחזר פעולה זו.</p>
        </DialogContent>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button variant="destructive" onClick={onConfirm}>מחיקה</Button>
        </DialogFooter>
    </Dialog>
);

export default TradesPage;
