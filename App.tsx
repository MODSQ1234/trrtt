
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTrades } from './services/db';
import TradesPage from './components/TradesPage';
import ImportPage from './components/ImportPage';
import DashboardPage from './components/DashboardPage';
import { SunIcon, MoonIcon, BookOpenIcon } from './components/ui';

const App = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });
    const { trades, addTrade, updateTrade, deleteTrade, bulkAddTrades } = useTrades();

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    const navItems = [
        { path: '/trades', label: 'העסקאות שלי' },
        { path: '/import', label: 'ייבוא CSV' },
        { path: '/dashboard', label: 'דשבורד' },
    ];

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`;

    return (
        <HashRouter>
            <div className="min-h-screen bg-background text-foreground">
                <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <BookOpenIcon className="h-6 w-6" />
                                <span className="text-lg">יומן מסחר</span>
                            </div>
                            <nav className="hidden md:flex items-center gap-4">
                                {navItems.map(item => (
                                    <NavLink key={item.path} to={item.path} className={navLinkClasses}>
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                aria-label="Toggle theme"
                            >
                                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    {/* Mobile nav */}
                     <nav className="md:hidden border-t border-border/40 flex items-center justify-around p-2">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} className={navLinkClasses}>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </header>
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={<Navigate to="/trades" replace />} />
                        <Route path="/trades" element={<TradesPage trades={trades} addTrade={addTrade} updateTrade={updateTrade} deleteTrade={deleteTrade} />} />
                        <Route path="/import" element={<ImportPage onImport={bulkAddTrades} />} />
                        <Route path="/dashboard" element={<DashboardPage trades={trades} />} />
                    </Routes>
                </main>
            </div>
        </HashRouter>
    );
};

export default App;
