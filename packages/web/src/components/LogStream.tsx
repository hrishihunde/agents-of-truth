/**
 * @fileoverview Log Stream Component
 * 
 * Displays real-time agent action logs with auto-scroll.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry } from '../lib/api';

interface LogStreamProps {
    logs: LogEntry[];
    maxHeight?: string;
    showTimestamps?: boolean;
}

const logColors: Record<LogEntry['level'], { text: string; bg: string; icon: string }> = {
    debug: { text: 'text-gray-400', bg: 'bg-gray-800', icon: '🔍' },
    info: { text: 'text-blue-300', bg: 'bg-blue-900/30', icon: 'ℹ️' },
    warn: { text: 'text-yellow-300', bg: 'bg-yellow-900/30', icon: '⚠️' },
    error: { text: 'text-red-300', bg: 'bg-red-900/30', icon: '❌' },
};

export function LogStream({ logs, maxHeight = '400px', showTimestamps = true }: LogStreamProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    };

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-300">Agent Logs</span>
                </div>
                <span className="text-xs text-gray-500">{logs.length} entries</span>
            </div>

            {/* Log Content */}
            <div
                ref={containerRef}
                className="overflow-y-auto font-mono text-sm"
                style={{ maxHeight }}
            >
                {logs.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">
                        Waiting for agent activity...
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {logs.map((log, index) => {
                            const colors = logColors[log.level];
                            return (
                                <div
                                    key={index}
                                    className={`px-4 py-2 ${colors.bg} hover:bg-gray-800/50 transition-colors`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <span className="text-base flex-shrink-0 mt-0.5">{colors.icon}</span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Timestamp */}
                                                {showTimestamps && (
                                                    <span className="text-gray-500 text-xs">
                                                        {formatTimestamp(log.timestamp)}
                                                    </span>
                                                )}

                                                {/* Level Badge */}
                                                <span className={`text-xs uppercase ${colors.text} opacity-70`}>
                                                    [{log.level}]
                                                </span>
                                            </div>

                                            {/* Message */}
                                            <p className={`${colors.text} mt-0.5 break-words`}>
                                                {log.message}
                                            </p>

                                            {/* Data */}
                                            {log.data && Object.keys(log.data).length > 0 && (
                                                <pre className="mt-1 text-xs text-gray-500 overflow-auto max-h-24">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
