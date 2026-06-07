// app/monitor/page.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Eye,
  RotateCcw,
  BarChart3,
  Hourglass,
  PlayCircle,
} from "lucide-react";

export default function MonitorPage() {
  const [jobs, setJobs] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [forcingRetry, setForcingRetry] = useState(null);
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "retry", "summary"

  // Fetch retry jobs
  const fetchRetryJobs = async () => {
    try {
      const res = await api.get("/api/admin/monitor/retry-jobs");
      return res.data?.data || [];
    } catch (err) {
      console.error("Error fetching retry jobs:", err);
      return [];
    }
  };

  // Fetch pending jobs (SEMUA job yang belum selesai)
  const fetchPendingJobs = async () => {
    try {
      const res = await api.get("/api/admin/monitor/pending-jobs");
      return res.data?.data || [];
    } catch (err) {
      console.error("Error fetching pending jobs:", err);
      return [];
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/admin/monitor/retry-jobs/summary");
      return res.data?.data || null;
    } catch (err) {
      console.error("Error fetching summary:", err);
      return null;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [retryData, pendingData, summaryData] = await Promise.all([
        fetchRetryJobs(),
        fetchPendingJobs(),
        fetchSummary(),
      ]);

      setJobs(retryData);
      setPendingJobs(pendingData);
      setSummary(summaryData);

      console.log("📊 Retry jobs:", retryData.length);
      console.log("📊 Pending jobs:", pendingData.length);
      console.log("📊 Summary:", summaryData);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []); // isi deps sesuai yang dipakai di dalamnya

  // Force retry
  const handleForceRetry = async (orderId) => {
    setForcingRetry(orderId);
    try {
      await api.post(`/api/admin/monitor/retry-jobs/${orderId}/force`);

      // Refresh data
      await fetchData();

      // Show success message
      toast.success(`✅ Retry triggered for order ${orderId}`);
    } catch (err) {
      toast.error(
        err.response?.data?.error || err.message || "Failed to force retry",
      );
    } finally {
      setForcingRetry(null);
    }
  };

  // Manual process job (langsung proses tanpa menunggu retry)
  const handleManualProcess = async (orderId) => {
    setForcingRetry(orderId);
    try {
      // Hapus parameter ?immediate=true
      await api.post(`/api/admin/monitor/retry-jobs/${orderId}/force`);

      await fetchData();
      toast.success(`✅ Job ${orderId} diproses manual`);
    } catch (err) {
      toast.error(
        err.response?.data?.error || err.message || "Failed to process job",
      );
    } finally {
      setForcingRetry(null);
    }
  };

  // View job detail
  const handleViewDetail = async (orderId) => {
    try {
      const res = await api.get(`/api/admin/monitor/retry-jobs/${orderId}`);
      setSelectedJob(res.data?.data);
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          "Failed to fetch job detail",
      );
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get retry badge
  const getRetryBadge = (job) => {
    if (job.will_retry) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <RefreshCw className="w-3 h-3 mr-1" />
          Will retry at {formatDate(job.next_retry_at)}
        </span>
      );
    }
    if (job.is_retryable) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Retryable
        </span>
      );
    }
    if (job.last_error_code === "CUTOFF") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Hourglass className="w-3 h-3 mr-1" />
          Cut Off
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="w-3 h-3 mr-1" />
        No retry
      </span>
    );
  };

  // Render jobs table
  const renderJobsTable = (jobsList, showManualProcess = false) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Order ID
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Info
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Error Code
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Next Retry
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && jobsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p>Loading jobs...</p>
                  </div>
                </td>
              </tr>
            ) : jobsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">
                      No jobs found
                    </p>
                    <p className="text-sm mt-1">
                      All jobs are processed successfully
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              jobsList.map((job) => (
                <tr
                  key={job.order_id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {job.order_id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(job.digiflazz_status)}
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(job.digiflazz_status)}`}
                      >
                        {job.digiflazz_status || "pending"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Attempt:</span>
                        <span className="font-mono text-sm font-medium">
                          {job.retry_count}/5
                        </span>
                      </div>
                      {getRetryBadge(job)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.last_error_code ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        {job.last_error_code}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.next_retry_at ? (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 font-medium">
                          {formatDate(job.next_retry_at)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(job.next_retry_at) > new Date()
                            ? "Upcoming"
                            : "Overdue"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewDetail(job.order_id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {job.is_retryable && (
                        <button
                          onClick={() => handleForceRetry(job.order_id)}
                          disabled={forcingRetry === job.order_id}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Force Retry"
                        >
                          {forcingRetry === job.order_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {showManualProcess && (
                        <button
                          onClick={() => handleManualProcess(job.order_id)}
                          disabled={forcingRetry === job.order_id}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Process Now"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
    <ToastContainer position="top-right" autoClose={3000} />
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Digiflazz Job Monitor
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Monitor and manage all Digiflazz jobs
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex overflow-auto">
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-4 px-1 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pending"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Hourglass className="w-4 h-4" />
              <span>Pending Jobs</span>
              {pendingJobs && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                  {pendingJobs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("retry")}
              className={`pb-4 px-1 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "retry"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Jobs</span>
              {jobs && (
                <span className="ml-2 bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full text-xs">
                  {jobs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-4 px-1 flex items-center space-x-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "summary"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statistics</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "pending" && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Jobs ({pendingJobs.length})
              </h2>
              <p className="text-sm text-gray-500">
                Jobs that are waiting to be processed
              </p>
            </div>
            {renderJobsTable(pendingJobs, true)}
          </div>
        )}

        {activeTab === "retry" && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Retry Jobs ({jobs.length})
              </h2>
              <p className="text-sm text-gray-500">
                Jobs that are in retry process
              </p>
            </div>
            {renderJobsTable(jobs, false)}
          </div>
        )}

        {activeTab === "summary" && summary && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Pending
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {summary.total_pending || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Hourglass className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Success
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {summary.total_success || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Failed
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {summary.total_failed || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cut Off</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {summary.total_cutoff || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Retry Statistics
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Average Retry Count</span>
                      <span className="font-medium text-gray-900">
                        {summary.average_retry_count?.toFixed(2) || "0"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2"
                        style={{
                          width: `${Math.min((summary.average_retry_count || 0) * 20, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Next Hour Retry Jobs
                      </span>
                      <span className="font-medium text-gray-900">
                        {summary.next_hour_retry_jobs || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 rounded-full h-2"
                        style={{
                          width: `${Math.min((summary.next_hour_retry_jobs / Math.max(summary.total_retry_jobs, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Overdue Jobs</span>
                      <span className="font-medium text-gray-900">
                        {summary.overdue_jobs || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 rounded-full h-2"
                        style={{
                          width: `${Math.min((summary.overdue_jobs / Math.max(summary.total_retry_jobs, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Status Distribution
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Success</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {summary.total_success || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Failed</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {summary.total_failed || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {summary.total_pending || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Cut Off</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {summary.total_cutoff || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
              Last updated: {formatDate(summary.timestamp)}
            </div>
          </div>
        )}

        {/* Job Detail Modal (sama seperti sebelumnya) */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Job Details
                  </h3>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* ... detail job (sama seperti sebelumnya) ... */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Order ID
                    </label>
                    <p className="mt-1 font-mono text-sm font-medium">
                      {selectedJob.order_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Transaction ID
                    </label>
                    <p className="mt-1 text-sm">{selectedJob.transaction_id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Digiflazz Status
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedJob.digiflazz_status)}`}
                      >
                        {selectedJob.digiflazz_status || "unknown"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Retry Count
                    </label>
                    <p className="mt-1 text-sm font-medium">
                      {selectedJob.retry_count}/5
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Status Message
                    </label>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {selectedJob.status_message || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Last Error Code
                    </label>
                    <p className="mt-1">
                      {selectedJob.last_error_code ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          {selectedJob.last_error_code}
                        </span>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Next Retry
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(selectedJob.next_retry_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Created At
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(selectedJob.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Updated At
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(selectedJob.updated_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Job Type
                    </label>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          selectedJob.job_type === "cutoff"
                            ? "bg-purple-100 text-purple-800"
                            : selectedJob.job_type === "retry"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedJob.job_type || "pending"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
