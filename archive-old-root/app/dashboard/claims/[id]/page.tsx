'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, User, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Claim {
  claimId: string;
  claimNumber: string;
  claimType: string;
  status: string;
  priority: string;
  incidentDate: string;
  location: string;
  description: string;
  desiredOutcome: string;
  attachments: any[];
  witnessesPresent: boolean;
  witnessDetails: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
  investigation: { label: 'Investigation', color: 'bg-orange-100 text-orange-800' },
  pending_documentation: { label: 'Pending Docs', color: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

const claimTypeLabels: Record<string, string> = {
  grievance_discipline: 'Grievance - Discipline',
  grievance_schedule: 'Grievance - Schedule',
  grievance_pay: 'Grievance - Pay',
  workplace_safety: 'Workplace Safety',
  discrimination_age: 'Discrimination - Age',
  discrimination_gender: 'Discrimination - Gender',
  discrimination_race: 'Discrimination - Race',
  discrimination_disability: 'Discrimination - Disability',
  harassment_verbal: 'Harassment - Verbal',
  harassment_physical: 'Harassment - Physical',
  harassment_sexual: 'Harassment - Sexual',
  contract_dispute: 'Contract Dispute',
  retaliation: 'Retaliation',
  other: 'Other',
};

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;
  
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/claims/${claimId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch claim');
        }
        
        const data = await response.json();
        setClaim(data.claim);
      } catch (err) {
        console.error('Error fetching claim:', err);
        setError(err instanceof Error ? err.message : 'Failed to load claim');
      } finally {
        setLoading(false);
      }
    };

    if (claimId) {
      fetchClaim();
    }
  }, [claimId]);

  const handleUploadComplete = (attachment: any) => {
    // Refresh claim data to show new attachment
    if (claim) {
      setClaim({
        ...claim,
        attachments: [...(claim.attachments || []), attachment],
      });
    }
  };

  const handleDeleteComplete = (url: string) => {
    // Update claim data to remove deleted attachment
    if (claim) {
      setClaim({
        ...claim,
        attachments: (claim.attachments || []).filter((a: any) => a.url !== url),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Claim</h2>
            <p className="text-gray-600 mb-4">{error || 'Claim not found'}</p>
            <Link href="/dashboard/claims">
              <Button>Back to Claims</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusLabels[claim.status] || { label: claim.status, color: 'bg-gray-100 text-gray-800' };
  const priorityInfo = priorityLabels[claim.priority] || { label: claim.priority, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard/claims">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft size={20} />
              Back to My Claims
            </button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{claim.claimNumber}</h1>
              <p className="text-gray-600">{claimTypeLabels[claim.claimType] || claim.claimType}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Claim Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900 mt-1">{claim.description}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Desired Outcome</label>
                    <p className="text-gray-900 mt-1">{claim.desiredOutcome}</p>
                  </div>

                  {claim.witnessesPresent && claim.witnessDetails && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Witnesses</label>
                      <p className="text-gray-900 mt-1">{claim.witnessDetails}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* File Attachments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    claimId={claim.claimId}
                    existingAttachments={claim.attachments || []}
                    onUploadComplete={handleUploadComplete}
                    onDeleteComplete={handleDeleteComplete}
                    maxFiles={10}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Incident Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Incident Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Incident Date</p>
                      <p className="text-gray-900">{new Date(claim.incidentDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-gray-900">{claim.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Submitted</p>
                      <p className="text-gray-900">{new Date(claim.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="text-gray-900">{new Date(claim.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Help */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <CheckCircle size={18} />
                    What&apos;s Next?
                  </h3>
                  <p className="text-sm text-blue-800">
                    {claim.status === 'submitted' && 'Your claim has been submitted and is awaiting review by a union steward.'}
                    {claim.status === 'under_review' && 'A union steward is reviewing your claim and will contact you soon.'}
                    {claim.status === 'investigation' && 'Your claim is being investigated. You may be contacted for additional information.'}
                    {claim.status === 'pending_documentation' && 'Additional documentation is needed. Please upload any requested files above.'}
                    {claim.status === 'resolved' && 'Your claim has been resolved. Check your email for details.'}
                    {!['submitted', 'under_review', 'investigation', 'pending_documentation', 'resolved'].includes(claim.status) && 
                      'You will be notified of any updates to your claim.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
