
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Lap, StopwatchStatus } from './types';

// --- HELPER FUNCTIONS & COMPONENTS (defined outside App to prevent re-creation) ---

const formatTime = (timeInMs: number): string => {
    const totalCentiseconds = Math.floor(timeInMs / 10);
    const centiseconds = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    const paddedCentiseconds = String(centiseconds).padStart(2, '0');

    return `${paddedMinutes}:${paddedSeconds}:${paddedCentiseconds}`;
};

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

interface ControlButtonProps {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, disabled = false, className = '', children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-lg font-semibold border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
    >
        {children}
    </button>
);

interface LapListProps {
    laps: Lap[];
}

const LapList: React.FC<LapListProps> = ({ laps }) => {
    const { fastest, slowest } = useMemo(() => {
        if (laps.length < 2) return { fastest: null, slowest: null };
        
        let fastestLap = laps[0];
        let slowestLap = laps[0];

        laps.forEach(lap => {
            if (lap.lapTime < fastestLap.lapTime) fastestLap = lap;
            if (lap.lapTime > slowestLap.lapTime) slowestLap = lap;
        });

        return { fastest: fastestLap, slowest: slowestLap };
    }, [laps]);

    if (laps.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-600">No laps recorded yet.</div>;
    }

    return (
        <div className="w-full max-w-md h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mt-8">
            <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="px-4 py-2">Lap</th>
                        <th className="px-4 py-2">Lap Time</th>
                        <th className="px-4 py-2 text-right">Overall Time</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200">
                    {[...laps].reverse().map((lap) => {
                        const isFastest = lap === fastest;
                        const isSlowest = lap === slowest;
                        let rowClass = "border-b border-gray-200 dark:border-gray-700";
                        if (isFastest) rowClass += " text-green-500 dark:text-green-400";
                        if (isSlowest) rowClass += " text-red-500 dark:text-red-400";
                        return (
                            <tr key={lap.lapNumber} className={rowClass}>
                                <td className="px-4 py-3 font-medium">{lap.lapNumber}</td>
                                <td className="px-4 py-3 font-mono">{formatTime(lap.lapTime)}</td>
                                <td className="px-4 py-3 text-right font-mono">{formatTime(lap.overallTime)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

export default function App() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [time, setTime] = useState<number>(0);
    const [laps, setLaps] = useState<Lap[]>([]);
    const [status, setStatus] = useState<StopwatchStatus>('idle');
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    // Theme Management
    useEffect(() => {
        const savedTheme = localStorage.getItem('stopwatch-theme');
        const initialTheme = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
        setTheme(initialTheme);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('stopwatch-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    // Load state from localStorage
    useEffect(() => {
        try {
            const savedState = localStorage.getItem('stopwatch-state');
            if (savedState) {
                const { time: savedTime, laps: savedLaps, status: savedStatus } = JSON.parse(savedState);
                if (typeof savedTime === 'number' && Array.isArray(savedLaps)) {
                    setTime(savedTime);
                    setLaps(savedLaps);
                    // If app was closed while running, restore as paused to not lose time.
                    setStatus(savedStatus === 'running' ? 'paused' : savedStatus);
                }
            }
        } catch (e) {
            console.error("Failed to load state from localStorage:", e);
        }
    }, []);

    // Save state to localStorage
    useEffect(() => {
        try {
            const stateToSave = JSON.stringify({ time, laps, status });
            localStorage.setItem('stopwatch-state', stateToSave);
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
        }
    }, [time, laps, status]);

    const runTimer = useCallback(() => {
        setTime(Date.now() - startTimeRef.current);
        timerRef.current = requestAnimationFrame(runTimer);
    }, []);

    const vibrate = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    const handleStart = () => {
        vibrate();
        setStatus('running');
        startTimeRef.current = Date.now() - time;
        timerRef.current = requestAnimationFrame(runTimer);
    };

    const handlePause = () => {
        vibrate();
        setStatus('paused');
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };

    const handleReset = () => {
        vibrate();
        setStatus('idle');
        setTime(0);
        setLaps([]);
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
    
    const handleLap = () => {
        if (status !== 'running') return;
        vibrate();
        const lastLapTime = laps.length > 0 ? laps[laps.length - 1].overallTime : 0;
        const newLap: Lap = {
            lapNumber: laps.length + 1,
            lapTime: time - lastLapTime,
            overallTime: time,
        };
        setLaps(prevLaps => [...prevLaps, newLap]);
    };

    const handleExport = () => {
        const header = "Lap,Lap Time,Overall Time\n";
        const rows = laps.map(lap =>
            `${lap.lapNumber},${formatTime(lap.lapTime)},${formatTime(lap.overallTime)}`
        ).join("\n");
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURI(header + rows);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "stopwatch_laps.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>

            <div className="w-full max-w-md mx-auto text-center">
                <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-200">Stopwatch</h1>
                <div className="font-mono text-6xl md:text-8xl tracking-tighter mb-8 bg-white/50 dark:bg-black/20 p-4 rounded-xl">
                    {formatTime(time)}
                </div>

                <div className="flex justify-center space-x-4 mb-8">
                    {status === 'idle' && (
                        <>
                            <ControlButton onClick={handleReset} disabled={true} className="bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500">Reset</ControlButton>
                            <ControlButton onClick={handleStart} className="bg-green-100 dark:bg-green-900/50 border-green-500 text-green-600 dark:text-green-300 focus:ring-green-300">Start</ControlButton>
                        </>
                    )}
                    {status === 'running' && (
                        <>
                            <ControlButton onClick={handleLap} className="bg-blue-100 dark:bg-blue-900/50 border-blue-500 text-blue-600 dark:text-blue-300 focus:ring-blue-300">Lap</ControlButton>
                            <ControlButton onClick={handlePause} className="bg-red-100 dark:bg-red-900/50 border-red-500 text-red-600 dark:text-red-300 focus:ring-red-300">Pause</ControlButton>
                        </>
                    )}
                    {status === 'paused' && (
                        <>
                            <ControlButton onClick={handleReset} className="bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:ring-gray-400">Reset</ControlButton>
                            <ControlButton onClick={handleStart} className="bg-green-100 dark:bg-green-900/50 border-green-500 text-green-600 dark:text-green-300 focus:ring-green-300">Resume</ControlButton>
                        </>
                    )}
                </div>

                {laps.length > 0 &&
                    <button onClick={handleExport} className="mb-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-gray-900">
                        <DownloadIcon /> Export CSV
                    </button>
                }
                
                <LapList laps={laps} />
            </div>
        </div>
    );
}
