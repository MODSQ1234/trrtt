import React, { useMemo } from 'react';
import type { Trade } from '../types';
import { Side } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui';
import { calculateNetAmount, formatCurrency } from '../lib/utils';

interface DashboardPageProps {
    trades: Trade[];
}

const DashboardPage = ({ trades }: DashboardPageProps) => {
    const Recharts = (window as any).Recharts;

    if (!Recharts) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold">דשבורד</h1>
                <Card>
                    <CardHeader><CardTitle>טוען נתונים...</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center h-64">
                       <p className="text-muted-foreground">טוען רכיבי תרשימים...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const kpis = useMemo(() => {
        const totalTrades = trades.length;
        const buyCount = trades.filter(t => t.side === Side.BUY).length;
        const sellCount = trades.filter(t => t.side === Side.SELL).length;

        const totalVolumeILS = trades
            .filter(t => t.currency === 'ILS')
            .reduce((sum, trade) => sum + (trade.price * trade.quantity), 0);

        return { totalTrades, buyCount, sellCount, totalVolumeILS };
    }, [trades]);

    const monthlyData = useMemo(() => {
        const monthlyMap = trades.reduce((acc, trade) => {
            const month = trade.executedAt.substring(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { buys: 0, sells: 0 };
            }
            const netAmount = calculateNetAmount(trade);
            if (trade.side === Side.BUY) {
                acc[month].buys += Math.abs(netAmount);
            } else {
                acc[month].sells += Math.abs(netAmount);
            }
            return acc;
        }, {} as Record<string, { buys: number, sells: number }>);

        return Object.entries(monthlyMap)
            .map(([month, values]) => ({ month, ...values }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [trades]);

    const sideDistribution = useMemo(() => {
        return [
            { name: 'קניות', value: kpis.buyCount, fill: 'var(--color-red)' },
            { name: 'מכירות', value: kpis.sellCount, fill: 'var(--color-green)' },
        ];
    }, [kpis]);

    if (trades.length === 0) {
        return (
            <div className="text-center py-16">
                 <h1 className="text-3xl font-bold mb-8">דשבורד</h1>
                <p className="text-muted-foreground">אין נתונים להצגה. בצע/י עסקה או ייבא/י נתונים כדי לראות את הדשבורד.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8" style={{'--color-red': '#ef4444', '--color-green': '#22c55e'} as React.CSSProperties}>
            <h1 className="text-3xl font-bold">דשבורד</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="סך הכל עסקאות" value={kpis.totalTrades.toString()} />
                <KpiCard title="עסקאות קנייה" value={kpis.buyCount.toString()} />
                <KpiCard title="עסקאות מכירה" value={kpis.sellCount.toString()} />
                <KpiCard title='סה"כ ווליום (ILS)' value={formatCurrency(kpis.totalVolumeILS, 'ILS')} />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>נפח פעילות חודשי (נטו)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MonthlyVolumeChart data={monthlyData} R={Recharts} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>התפלגות קנייה/מכירה</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SideDistributionChart data={sideDistribution} R={Recharts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value }: { title: string; value: string }) => (
    <Card>
        <CardHeader>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
        </CardHeader>
    </Card>
);

const MonthlyVolumeChart = ({ data, R }: { data: any[]; R: any }) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = R;
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrency(value, 'ILS')} domain={[0, 'dataMax + 1000']}/>
                <YAxis type="category" dataKey="month" stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value, 'ILS')}
                />
                <Legend />
                <Bar dataKey="sells" name="מכירות" stackId="a" fill="var(--color-green)" radius={[0, 4, 4, 0]}/>
                <Bar dataKey="buys" name="קניות" stackId="a" fill="var(--color-red)" radius={[4, 0, 0, 4]}/>
            </BarChart>
        </ResponsiveContainer>
    );
};

const SideDistributionChart = ({ data, R }: { data: any[]; R: any }) => {
    const { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } = R;
    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        );
                    }}
                >
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default DashboardPage;