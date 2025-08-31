import React, { useState, useCallback } from 'react';
import type { TradeFormData } from '../types';
import { Side, Currency } from '../types';
import { Button, Card, CardHeader, CardTitle, CardContent, Select, AlertCircleIcon, CheckCircleIcon, UploadCloudIcon, XIcon } from './ui';

interface ImportPageProps {
    onImport: (trades: TradeFormData[]) => Promise<number>;
}

const REQUIRED_FIELDS: (keyof TradeFormData)[] = ['symbol', 'side', 'quantity', 'price', 'executedAt'];
const TRADE_FIELDS: { key: keyof TradeFormData, label: string }[] = [
    { key: 'symbol', label: 'סימבול' },
    { key: 'side', label: 'צד (קנייה/מכירה)' },
    { key: 'quantity', label: 'כמות' },
    { key: 'price', label: 'מחיר' },
    { key: 'executedAt', label: 'תאריך ושעה' },
    { key: 'fees', label: 'עמלות' },
    { key: 'tax', label: 'מס' },
    { key: 'currency', label: 'מטבע' },
    { key: 'note', label: 'הערה' },
];

const ImportPage = ({ onImport }: ImportPageProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importResult, setImportResult] = useState<{ success: number; errors: any[] } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const resetState = () => {
        setFile(null);
        setHeaders([]);
        setRows([]);
        setMapping({});
        setImportResult(null);
        setIsProcessing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const Papa = (window as any).Papa;
            if (!Papa) {
                console.error("PapaParse library is not loaded.");
                return;
            }
            resetState();
            setFile(selectedFile);
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                preview: 10,
                complete: (results: any) => {
                    setHeaders(results.meta.fields);
                    setRows(results.data);
                    // Auto-mapping attempt
                    const initialMapping: Record<string, string> = {};
                    TRADE_FIELDS.forEach(field => {
                        const foundHeader = results.meta.fields.find((h: string) => h.toLowerCase().includes(field.key.toLowerCase()));
                        if (foundHeader) {
                            initialMapping[field.key] = foundHeader;
                        }
                    });
                    setMapping(initialMapping);
                }
            });
        }
    };
    
    const handleMappingChange = (tradeField: string, csvHeader: string) => {
        setMapping(prev => ({ ...prev, [tradeField]: csvHeader }));
    };

    const processAndImport = async () => {
        if (!file) return;

        const Papa = (window as any).Papa;
        if (!Papa) {
            console.error("PapaParse library is not loaded.");
            return;
        }

        setIsProcessing(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: any) => {
                const validTrades: TradeFormData[] = [];
                const errors: any[] = [];

                results.data.forEach((row: any, index: number) => {
                    try {
                        const trade: Partial<TradeFormData> = {};
                        TRADE_FIELDS.forEach(field => {
                            const csvHeader = mapping[field.key];
                            if (csvHeader && row[csvHeader] !== undefined && row[csvHeader] !== '') {
                                (trade as any)[field.key] = row[csvHeader];
                            }
                        });

                        // --- Validation and Transformation ---
                        if (!trade.symbol) throw new Error("חסר סימבול");
                        
                        // Side
                        const sideStr = String(trade.side || '').toLowerCase();
                        if (sideStr.includes('buy') || sideStr.includes('קניה')) trade.side = Side.BUY;
                        else if (sideStr.includes('sell') || sideStr.includes('מכירה')) trade.side = Side.SELL;
                        else throw new Error("צד לא חוקי (חייב להיות קנייה/מכירה)");

                        // Numbers
                        trade.quantity = parseFloat(String(trade.quantity).replace(/,/g, ''));
                        trade.price = parseFloat(String(trade.price).replace(/,/g, ''));
                        if (isNaN(trade.quantity) || trade.quantity <= 0) throw new Error("כמות לא חוקית");
                        if (isNaN(trade.price) || trade.price <= 0) throw new Error("מחיר לא חוקי");

                        trade.fees = trade.fees ? parseFloat(String(trade.fees).replace(/,/g, '')) : 0;
                        trade.tax = trade.tax ? parseFloat(String(trade.tax).replace(/,/g, '')) : 0;
                        
                        // Date
                        if (!trade.executedAt) throw new Error("חסר תאריך");
                        const parsedDate = new Date(trade.executedAt);
                        if (isNaN(parsedDate.getTime())) throw new Error("פורמט תאריך לא חוקי");
                        trade.executedAt = parsedDate.toISOString();
                        
                        // Currency
                        const currencyStr = String(trade.currency || 'ILS').toUpperCase();
                        if (currencyStr in Currency) {
                            trade.currency = currencyStr as Currency;
                        } else {
                            trade.currency = Currency.ILS;
                        }

                        validTrades.push(trade as TradeFormData);
                    } catch (e: any) {
                        errors.push({ row: index + 2, data: row, error: e.message });
                    }
                });

                const successCount = validTrades.length > 0 ? await onImport(validTrades) : 0;
                setImportResult({ success: successCount, errors });
                setIsProcessing(false);
            }
        });
    };

    const isMappingValid = REQUIRED_FIELDS.every(field => mapping[field]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">ייבוא מקובץ CSV</h1>
            
            {!file && (
                <Card className="text-center p-8 border-2 border-dashed border-muted-foreground/50">
                     <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-4 text-muted-foreground">
                        <UploadCloudIcon className="h-12 w-12" />
                        <span className="font-semibold">לחץ כאן כדי לבחור קובץ או גרור אותו לכאן</span>
                        <span className="text-sm">תומך בקבצי CSV בלבד</span>
                        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    </label>
                </Card>
            )}

            {file && (
                <>
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>מיפוי עמודות</CardTitle>
                            <p className="text-muted-foreground mt-1">קשר בין העמודות בקובץ שלך לשדות הנדרשים במערכת.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={resetState}>
                            <XIcon className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {TRADE_FIELDS.map(field => (
                            <div key={field.key}>
                                <label className="text-sm font-medium flex items-center gap-1">
                                    {field.label}
                                    {REQUIRED_FIELDS.includes(field.key) && <span className="text-red-500">*</span>}
                                </label>
                                <Select value={mapping[field.key] || ''} onChange={(e) => handleMappingChange(field.key, e.target.value)}>
                                    <option value="">בחר עמודה...</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </Select>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>תצוגה מקדימה (10 שורות ראשונות)</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b">
                                    {headers.map(h => <th key={h} className="p-2 font-medium">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className="border-b">
                                        {headers.map(h => <td key={h} className="p-2 truncate max-w-xs">{row[h]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Button onClick={processAndImport} disabled={!isMappingValid || isProcessing} size="lg">
                        {isProcessing ? 'מעבד...' : `ייבא עסקאות`}
                    </Button>
                    {!isMappingValid && <p className="text-sm text-red-500 mt-2">יש למפות את כל שדות החובה (*).</p>}
                </div>
                </>
            )}

            {importResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>תוצאות הייבוא</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircleIcon />
                            <span><strong>{importResult.success}</strong> עסקאות יובאו בהצלחה.</span>
                        </div>
                        {importResult.errors.length > 0 && (
                             <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                                <AlertCircleIcon className="mt-1 flex-shrink-0"/>
                                <div>
                                    <span><strong>{importResult.errors.length}</strong> שורות נכשלו ולא יובאו.</span>
                                    <ul className="text-sm list-disc list-inside mt-2 max-h-48 overflow-y-auto bg-muted p-2 rounded-md">
                                        {importResult.errors.map((err, i) => <li key={i}>שורה {err.row}: {err.error}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ImportPage;