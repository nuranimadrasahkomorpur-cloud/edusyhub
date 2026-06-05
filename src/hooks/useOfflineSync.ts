import { useEffect, useCallback } from 'react';

interface SyncTask {
    id: string;
    url: string;
    options: RequestInit;
    timestamp: number;
}

const QUEUE_KEY = 'edusy_offline_sync_queue';

interface UseOfflineSyncProps {
    onQueue?: () => void;
    onSyncSuccess?: () => void;
    onSyncError?: () => void;
}

export const useOfflineSync = ({ onQueue, onSyncSuccess, onSyncError }: UseOfflineSyncProps = {}) => {

    const getQueue = useCallback((): SyncTask[] => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse sync queue', e);
            return [];
        }
    }, []);

    const setQueue = useCallback((queue: SyncTask[]) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }, []);

    const addToQueue = useCallback((url: string, options: RequestInit) => {
        const queue = getQueue();
        const newTask: SyncTask = {
            id: crypto.randomUUID(),
            url,
            options,
            timestamp: Date.now()
        };
        setQueue([...queue, newTask]);
        if (onQueue) onQueue();
    }, [getQueue, setQueue, onQueue]);

    const processQueue = useCallback(async () => {
        if (!navigator.onLine) return;
        
        const queue = getQueue();
        if (queue.length === 0) return;

        console.log(`Processing offline sync queue: ${queue.length} items`);
        
        const failed: SyncTask[] = [];
        let successCount = 0;

        for (const task of queue) {
            try {
                // Try to execute the fetch
                const res = await fetch(task.url, task.options);
                if (res.ok) {
                    successCount++;
                } else {
                    // If it's a 4xx error (e.g. bad request, unauthorized), it might never succeed,
                    // but for a robust system we might want to discard 400s and keep 500s.
                    // For simplicity, we drop requests that return permanent errors to avoid infinite loops,
                    // except for network errors which fall into the catch block.
                    console.warn(`Sync task failed with status ${res.status}`, task);
                }
            } catch (error) {
                // Network error, keep in queue
                console.error(`Network error syncing task`, task);
                failed.push(task);
            }
        }

        setQueue(failed);
        
        if (successCount > 0 && onSyncSuccess) {
            onSyncSuccess();
        }
        if (failed.length > 0 && onSyncError) {
            onSyncError();
        }
    }, [getQueue, setQueue, onSyncSuccess, onSyncError]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            console.log('App is online. Processing sync queue...');
            processQueue();
        };

        window.addEventListener('online', handleOnline);
        
        // Also try to process queue on mount in case app started online with pending tasks
        if (navigator.onLine) {
            processQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [processQueue]);

    const fetchWithSync = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
        // If explicitly offline, queue it immediately and return a mock success
        if (typeof window !== 'undefined' && !navigator.onLine) {
            addToQueue(url, options);
            return new Response(JSON.stringify({ queued: true }), { status: 200, statusText: 'OK' });
        }

        try {
            const res = await fetch(url, options);
            return res;
        } catch (error) {
            // If fetch fails (e.g., network disconnect mid-request), queue it
            console.warn('Fetch failed, adding to offline queue:', error);
            addToQueue(url, options);
            return new Response(JSON.stringify({ queued: true }), { status: 200, statusText: 'OK' });
        }
    }, [addToQueue]);

    return { fetchWithSync, processQueue, getQueue };
};
