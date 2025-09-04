export interface RecentUpload {
    id: number;
    fileName: string;
    fileSize: number;
    status: "Pending" | "Processing" | "Completed" | "Failed";
    startedAt: string;          // ISO datetime string
    completedAt: string | null; // null if not finished
}

export interface QueueSummary {
    pendingCount: number;
    failedCount: number;
    recentUploads: RecentUpload[];
    totalSizeBytes: number;
    oldestPending: string | null; // ISO datetime string or null
    newestPending: string | null; // ISO datetime string or null
}
