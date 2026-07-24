import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader, CheckCircle, Send, Copy, X } from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorId?: string;
}

interface SystemInfo {
  os: string;
  osVersion: string;
  arch: string;
  platform: string;
  nodeVersion: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
}

interface ReportData {
  summary: string;
  description: string;
  steps: string;
  logs: string;
  systemInfo: SystemInfo | null;
  include: {
    logs: boolean;
    systemInfo: boolean;
    errorId?: string;
  };
}

export function ReportIssueModal({ isOpen, onClose, errorId }: ReportIssueModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const [formData, setFormData] = useState<ReportData>({
    summary: '',
    description: '',
    steps: '',
    logs: '',
    systemInfo: null,
    include: {
      logs: true,
      systemInfo: true,
      errorId,
    },
  });

  useEffect(() => {
    if (isOpen && isSubmitted === false) {
      loadSystemInfo();
      loadLogs();
    }
  }, [isOpen]);

  const loadSystemInfo = async () => {
    try {
      if (window.electron) {
        const sysInfo = await (window.electron as any).invoke('system:info');
        setFormData((prev) => ({
          ...prev,
          systemInfo: sysInfo,
        }));
      }
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const loadLogs = async () => {
    try {
      if (window.electron) {
        const logs = await (window.electron as any).invoke('logs:get', 500);
        setFormData((prev) => ({
          ...prev,
          logs,
        }));
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      include: {
        ...prev.include,
        [name]: checked,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (window.electron) {
        const result = await (window.electron as any).invoke('issue:submit', {
          summary: formData.summary,
          description: formData.description,
          steps: formData.steps,
          logs: formData.include.logs ? formData.logs : '',
          systemInfo: formData.include.systemInfo ? formData.systemInfo : null,
          errorId: formData.include.errorId || errorId,
          timestamp: new Date().toISOString(),
        });

        setSubmissionId(result.submissionId || `${Date.now()}`);
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Failed to submit issue:', error);
      alert('Failed to submit issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const reportText = `
Error Report
============
Summary: ${formData.summary}
Description: ${formData.description}
Steps to Reproduce: ${formData.steps}
Error ID: ${errorId}
Submission ID: ${submissionId}

System Information:
${JSON.stringify(formData.systemInfo, null, 2)}

Logs:
${formData.logs}
    `.trim();

    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Report an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Summary */}
              <div>
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                  Summary <span className="text-red-500">*</span>
                </label>
                <input
                  id="summary"
                  type="text"
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the issue"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Error ID (if available) */}
              {errorId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Error ID
                  </label>
                  <input
                    type="text"
                    value={errorId}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-xs"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detailed description of what happened"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-2">
                  Steps to Reproduce
                </label>
                <textarea
                  id="steps"
                  name="steps"
                  value={formData.steps}
                  onChange={handleInputChange}
                  placeholder="How to reproduce the issue (e.g., 1. Click here, 2. Then click there...)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Include Options */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Include in Report:</p>

                <div className="flex items-center gap-3">
                  <input
                    id="include-logs"
                    type="checkbox"
                    name="logs"
                    checked={formData.include.logs}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="include-logs" className="text-sm text-gray-700">
                    Include application logs (last 500 lines)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="include-systeminfo"
                    type="checkbox"
                    name="systemInfo"
                    checked={formData.include.systemInfo}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="include-systeminfo" className="text-sm text-gray-700">
                    Include system information (OS, versions, etc.)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formData.summary || !formData.description}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success Message */
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="text-green-600" size={48} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Thank You!
              </h3>

              <p className="text-gray-600 mb-4">
                Your issue report has been submitted successfully.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs font-mono text-gray-600 mb-2">Submission ID:</p>
                <p className="text-sm font-mono text-gray-900 font-semibold break-all">
                  {submissionId}
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Keep this ID for your records. Our support team will review your report and contact you if needed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy size={18} />
                  {copiedToClipboard ? 'Copied!' : 'Copy Details'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
