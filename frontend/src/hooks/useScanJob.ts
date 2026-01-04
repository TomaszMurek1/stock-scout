import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  result: any;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface UseScanJobOptions<TResult> {
  onCompleted?: (result: TResult) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export function useScanJob<TResult = any>({
  onCompleted,
  onError,
  pollInterval = 3000,
}: UseScanJobOptions<TResult> = {}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TResult | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const checkJobStatus = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get<Job>(`/jobs/${id}`);
      const job = response.data;
      setStatus(job.status);

      if (job.status === "COMPLETED") {
        setResult(job.result);
        setIsLoading(false);
        stopPolling();
        if (onCompleted) onCompleted(job.result);
        
      } else if (job.status === "FAILED") {
        const errMsg = job.error || "Unknown job error";
        setError(errMsg);
        setIsLoading(false);
        stopPolling();
        toast.error(errMsg);
        if (onError) onError(errMsg);
      }
      // If PENDING or RUNNING, continue polling
    } catch (err: any) {
        console.error("Error polling job status:", err);
        // Don't stop polling immediately on network transient error, but maybe count errors?
        // For now, let's just log. If 404, maybe stop.
        if (err.response?.status === 404) {
            setError("Job not found");
            setIsLoading(false);
            stopPolling();
            toast.error("Job not found");
        }
    }
  }, [onCompleted, onError, stopPolling]);

  const startJob = useCallback(async (apiCall: () => Promise<{ data: { job_id: string } }>) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setJobId(null);
    setStatus("PENDING");

    try {
      const response = await apiCall();
      // Expecting response.data to have job_id. 
      // Some endpoints might return { status: "success", job_id: "..." } or similar.
      // Adjust based on backend response shape. 
      // Plan implies: return job_id immediately.
      // Let's assume standard response: { job_id: "uuid" } or { data: { job_id: "uuid" } }
      // Actually standard fastapi return is usually JSON.
      
      const id = response.data.job_id;
      if (!id) {
          throw new Error("No job_id returned from scan initiation");
      }
      
      setJobId(id);
      
      // Start polling
      if (pollIntervalRef.current) stopPolling();
      
      pollIntervalRef.current = setInterval(() => {
        checkJobStatus(id);
      }, pollInterval);
      
    } catch (err: any) {
      console.error("Failed to start job:", err);
      const msg = err.response?.data?.detail || err.message || "Failed to start scan";
      setError(msg);
      setIsLoading(false);
      toast.error(msg);
      if (onError) onError(msg);
    }
  }, [checkJobStatus, onError, pollInterval, stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    startJob,
    isLoading,
    status,
    result,
    error,
    jobId
  };
}
