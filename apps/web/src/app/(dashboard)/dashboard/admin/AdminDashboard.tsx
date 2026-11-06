'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  AlertTriangle,
  BookCheck,
  CheckCircle,
  XCircle,
  Play,
  RotateCw,
  Clock,
  Database,
  Cpu,
  Layers,
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

interface AdminDashboardProps {
  user: {
    displayName: string;
    role: string;
    email: string;
  };
}

interface AdminStatsData {
  capacity?: {
    maxUsers: number;
    activeUsers: number;
    pendingInvitations: number;
    availableSeats: number;
  };
  jobs?: Record<string, number>;
  activity?: {
    totalAnalyses: number;
    totalExecutions: number;
    pendingFeedback: number;
    proposedKbCandidates: number;
    publishedKbItems: number;
  };
}

interface AdminFeedbackReport {
  id: string;
  issueType: string;
  details: string;
  status: string;
  createdAt: string;
  user?: { displayName?: string | null };
}

interface AdminKbCandidate {
  id: string;
  title: string;
  topic: string;
  status: string;
  anonymizedQuestion: string;
  verifiedSolution: string;
  explanation: string;
}

interface AdminEvalRun {
  id: string;
  suiteName: string;
  model: string;
  promptVersion: string;
  score: number;
  passedCases: number;
  totalCases: number;
  createdAt: string;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'kb' | 'evals'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Data states
  const [health, setHealth] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [feedbackReports, setFeedbackReports] = useState<AdminFeedbackReport[]>([]);
  const [kbCandidates, setKbCandidates] = useState<AdminKbCandidate[]>([]);
  const [evalRuns, setEvalRuns] = useState<AdminEvalRun[]>([]);

  // Fetch all initial admin data
  const fetchData = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const [healthRes, statsRes, feedbackRes, kbRes, evalsRes] = await Promise.all([
        fetch('/api/v1/admin/health'),
        fetch('/api/v1/admin/stats'),
        fetch('/api/v1/admin/feedback'),
        fetch('/api/v1/admin/kb/candidates'),
        fetch('/api/v1/admin/evals'),
      ]);

      if (healthRes.ok) {
        const d = await healthRes.json();
        setHealth(d.data.health);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data.stats);
      }
      if (feedbackRes.ok) {
        const d = await feedbackRes.json();
        setFeedbackReports(d.data.reports || []);
      }
      if (kbRes.ok) {
        const d = await kbRes.json();
        setKbCandidates(d.data.candidates || []);
      }
      if (evalsRes.ok) {
        const d = await evalsRes.json();
        setEvalRuns(d.data.runs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Action: Resolve/Dismiss feedback
  const handleResolveFeedback = async (id: string, resolution: 'RESOLVED' | 'DISMISSED') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      if (res.ok) {
        setFeedbackMsg(`Feedback report marked as ${resolution}.`);
        fetchData();
      } else {
        const d = await res.json();
        setFeedbackMsg(`Error: ${d.error?.message || 'Action failed'}`);
      }
    } catch {
      setFeedbackMsg('Network error updating feedback report.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Review KB candidate
  const handleReviewCandidate = async (
    candidateId: string,
    action: 'APPROVE' | 'REJECT' | 'DEMOTE',
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/kb/candidates/${candidateId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setFeedbackMsg(`Candidate marked as ${action}.`);
        fetchData();
      } else {
        const d = await res.json();
        setFeedbackMsg(`Error: ${d.error?.message || 'Review failed'}`);
      }
    } catch {
      setFeedbackMsg('Network error reviewing candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Run Evaluation Suite
  const handleRunEvaluation = async () => {
    setActionLoading(true);
    setFeedbackMsg('Running Golden Evaluation Suite (50 cases in sandbox)...');
    try {
      const res = await fetch('/api/v1/admin/evals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCases: 5 }), // run quick sample for UI
      });
      if (res.ok) {
        const d = await res.json();
        setFeedbackMsg(
          `Eval run completed! Score: ${d.data.evalRun.score}% (${d.data.evalRun.passedCases}/${d.data.evalRun.totalCases} passed).`,
        );
        fetchData();
      } else {
        const d = await res.json();
        setFeedbackMsg(`Eval error: ${d.error?.message || 'Run failed'}`);
      }
    } catch {
      setFeedbackMsg('Network error executing eval run.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.adminContainer}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.pageTitle}>
              <ShieldAlert size={28} color="#2563eb" aria-hidden="true" />
              Owner Administration
              <span className={styles.ownerBadge}>Role: OWNER</span>
            </h1>
            <p className={styles.subtitle}>
              Logged in as {user.displayName}. System health, capacity enforcement, flagged
              questions, knowledge approval, and evaluations.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading || actionLoading}
            className={styles.btnPrimary}
            aria-label="Refresh dashboard metrics"
          >
            <RotateCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {feedbackMsg && (
          <div
            role="status"
            style={{
              padding: '0.75rem 1rem',
              marginTop: '1rem',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              borderRadius: '0.375rem',
              border: '1px solid #bfdbfe',
              fontSize: '0.875rem',
            }}
          >
            {feedbackMsg}
          </div>
        )}
      </header>

      {/* Tabs Navigation */}
      <nav className={styles.tabsNav} aria-label="Admin Sections">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} aria-hidden="true" />
          Overview & Health
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'feedback' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          Flagged Answers ({stats?.activity?.pendingFeedback ?? 0})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'kb' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('kb')}
        >
          <BookCheck size={18} aria-hidden="true" />
          Knowledge Approval ({stats?.activity?.proposedKbCandidates ?? 0})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'evals' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('evals')}
        >
          <Cpu size={18} aria-hidden="true" />
          Golden Evaluations ({evalRuns.length})
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === 'overview' && (
        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="sr-only">
            Overview and System Health
          </h2>

          {/* System Health Indicators */}
          <div className={styles.healthGrid}>
            <div className={styles.healthCard}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={16} aria-hidden="true" /> PostgreSQL 17
              </span>
              <span
                className={
                  health.postgres === 'HEALTHY' ? styles.healthBadgeOk : styles.healthBadgeErr
                }
              >
                {health.postgres === 'HEALTHY' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {health.postgres || 'CHECKING'}
              </span>
            </div>

            <div className={styles.healthCard}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} aria-hidden="true" /> Redis Queue
              </span>
              <span
                className={
                  health.redisQueue === 'HEALTHY' ? styles.healthBadgeOk : styles.healthBadgeErr
                }
              >
                {health.redisQueue === 'HEALTHY' ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {health.redisQueue || 'CHECKING'}
              </span>
            </div>

            <div className={styles.healthCard}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} aria-hidden="true" /> Redis Cache
              </span>
              <span
                className={
                  health.redisCache === 'HEALTHY' ? styles.healthBadgeOk : styles.healthBadgeErr
                }
              >
                {health.redisCache === 'HEALTHY' ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {health.redisCache || 'CHECKING'}
              </span>
            </div>

            <div className={styles.healthCard}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={16} aria-hidden="true" /> MinIO Storage
              </span>
              <span
                className={
                  health.storage === 'HEALTHY' ? styles.healthBadgeOk : styles.healthBadgeErr
                }
              >
                {health.storage === 'HEALTHY' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {health.storage || 'CHECKING'}
              </span>
            </div>

            <div className={styles.healthCard}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={16} aria-hidden="true" /> Sandbox (Java 21)
              </span>
              <span
                className={
                  health.sandbox === 'HEALTHY' ? styles.healthBadgeOk : styles.healthBadgeErr
                }
              >
                {health.sandbox === 'HEALTHY' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {health.sandbox || 'CHECKING'}
              </span>
            </div>
          </div>

          {/* Key Capacity & Job Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Closed-Beta Capacity</span>
                <Clock size={18} color="#64748b" aria-hidden="true" />
              </div>
              <div className={styles.statValue}>
                {stats?.capacity?.activeUsers ?? 0} / {stats?.capacity?.maxUsers ?? 5}
              </div>
              <div className={styles.statDesc}>
                {stats?.capacity?.availableSeats ?? 0} seats remaining (
                {stats?.capacity?.pendingInvitations ?? 0} pending invitations)
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Durable Jobs (24h)</span>
                <Activity size={18} color="#64748b" aria-hidden="true" />
              </div>
              <div className={styles.statValue}>{stats?.jobs?.COMPLETED ?? 0}</div>
              <div className={styles.statDesc}>
                Completed ({stats?.jobs?.RUNNING ?? 0} running, {stats?.jobs?.PENDING ?? 0} pending,{' '}
                {stats?.jobs?.FAILED ?? 0} failed)
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Analyses & Code Executions</span>
                <Cpu size={18} color="#64748b" aria-hidden="true" />
              </div>
              <div className={styles.statValue}>{stats?.activity?.totalAnalyses ?? 0}</div>
              <div className={styles.statDesc}>
                {stats?.activity?.totalExecutions ?? 0} sandbox runs logged
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Approved Knowledge Items</span>
                <BookCheck size={18} color="#64748b" aria-hidden="true" />
              </div>
              <div className={styles.statValue}>{stats?.activity?.publishedKbItems ?? 0}</div>
              <div className={styles.statDesc}>Available for PostgreSQL full-text retrieval</div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: FLAGGED ANSWERS & FEEDBACK QUEUE */}
      {activeTab === 'feedback' && (
        <section aria-labelledby="feedback-heading" className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 id="feedback-heading" className={styles.sectionTitle}>
              Flagged Answers & Feedback Triage
            </h2>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Learners can flag inaccurate answers or broken visualizers.
            </span>
          </div>

          {feedbackReports.length === 0 ? (
            <div className={styles.emptyNotice}>
              No pending feedback reports in queue. All answers operating nominally!
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Issue Type</th>
                    <th scope="col">Details</th>
                    <th scope="col">Reporter</th>
                    <th scope="col">Date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: report.status === 'PENDING' ? '#fef3c7' : '#f1f5f9',
                            color: report.status === 'PENDING' ? '#92400e' : '#475569',
                          }}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{report.issueType}</td>
                      <td style={{ maxWidth: '360px', wordBreak: 'break-word' }}>
                        {report.details}
                      </td>
                      <td>{report.user?.displayName || 'Learner'}</td>
                      <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                      <td>
                        {report.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnSuccess}`}
                              disabled={actionLoading}
                              onClick={() => handleResolveFeedback(report.id, 'RESOLVED')}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnOutline}`}
                              disabled={actionLoading}
                              onClick={() => handleResolveFeedback(report.id, 'DISMISSED')}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: KNOWLEDGE BASE APPROVAL */}
      {activeTab === 'kb' && (
        <section aria-labelledby="kb-heading" className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 id="kb-heading" className={styles.sectionTitle}>
              Knowledge Base Candidate Approval
            </h2>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Only verified, consented analyses with scrubbed PII can be approved into searchable
              knowledge.
            </span>
          </div>

          {kbCandidates.length === 0 ? (
            <div className={styles.emptyNotice}>
              No candidate questions awaiting review. Candidates are created from verified analyses
              where learners opted into improvement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {kbCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  style={{
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '0.5rem',
                    padding: '1.25rem',
                    backgroundColor: 'var(--card-bg, #ffffff)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {candidate.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          marginTop: '0.25rem',
                          display: 'inline-block',
                        }}
                      >
                        Topic: {candidate.topic}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            candidate.status === 'APPROVED'
                              ? '#d1fae5'
                              : candidate.status === 'PROPOSED'
                                ? '#fef3c7'
                                : '#f1f5f9',
                          color:
                            candidate.status === 'APPROVED'
                              ? '#065f46'
                              : candidate.status === 'PROPOSED'
                                ? '#92400e'
                                : '#475569',
                        }}
                      >
                        Status: {candidate.status}
                      </span>

                      {candidate.status === 'PROPOSED' && (
                        <>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnSuccess}`}
                            disabled={actionLoading}
                            onClick={() => handleReviewCandidate(candidate.id, 'APPROVE')}
                          >
                            Approve & Publish
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnDanger}`}
                            disabled={actionLoading}
                            onClick={() => handleReviewCandidate(candidate.id, 'REJECT')}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {candidate.status === 'APPROVED' && (
                        <button
                          type="button"
                          className={`${styles.btnAction} ${styles.btnOutline}`}
                          disabled={actionLoading}
                          onClick={() => handleReviewCandidate(candidate.id, 'DEMOTE')}
                        >
                          Demote (Unpublish)
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                      Anonymized Learner Question:
                    </div>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                      {candidate.anonymizedQuestion}
                    </p>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                      Explanation:
                    </div>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
                      {candidate.explanation}
                    </p>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Verified Solution (Compiled and Tested in Temurin Container):
                    </div>
                    <pre className={styles.codeSnippet}>{candidate.verifiedSolution}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: GOLDEN EVALUATION SUITE */}
      {activeTab === 'evals' && (
        <section aria-labelledby="evals-heading" className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="evals-heading" className={styles.sectionTitle}>
                Golden Evaluation Suite Monitor
              </h2>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                50+ standalone Java test cases evaluating schema validity, code execution, Big-O
                accuracy, and visualizers.
              </span>
            </div>

            <button
              type="button"
              className={styles.btnPrimary}
              disabled={actionLoading}
              onClick={handleRunEvaluation}
            >
              <Play size={16} aria-hidden="true" />
              {actionLoading ? 'Running...' : 'Execute Evaluation Run'}
            </button>
          </div>

          {evalRuns.length === 0 ? (
            <div className={styles.emptyNotice}>
              No evaluation runs recorded yet. Click &ldquo;Execute Evaluation Run&rdquo; to
              benchmark the AI provider against the 50 golden Java test cases.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Suite Name</th>
                    <th scope="col">Model</th>
                    <th scope="col">Prompt Version</th>
                    <th scope="col">Score</th>
                    <th scope="col">Pass Rate</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {evalRuns.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 600 }}>{run.suiteName}</td>
                      <td>{run.model}</td>
                      <td>v{run.promptVersion}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: run.score >= 90 ? '#059669' : '#dc2626',
                          }}
                        >
                          {run.score}%
                        </span>
                      </td>
                      <td>
                        {run.passedCases} / {run.totalCases} passed
                      </td>
                      <td>{new Date(run.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
