'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, BookOpen, Scale, TrendingUp, Loader2, Calendar, Building2 } from 'lucide-react';

interface CBADashboardProps {
  className?: string;
}

interface CBA {
  id: string;
  cbaNumber: string;
  title: string;
  jurisdiction: string;
  employerName: string;
  unionName: string;
  effectiveDate: string;
  expiryDate: string;
  status: string;
  createdAt: string;
}

interface SearchResponse {
  results: CBA[];
  total: number;
  hasMore: boolean;
}

export function CBADashboard({ className }: CBADashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch recent CBAs
  const { data: recentCBAs, isLoading: isLoadingRecent } = useQuery<{ results: CBA[] }>({
    queryKey: ['cbas', 'recent'],
    queryFn: async () => {
      const response = await fetch('/api/cba/search?recent=true&limit=5');
      if (!response.ok) throw new Error('Failed to fetch recent CBAs');
      return response.json();
    },
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/cba/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 }),
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json() as Promise<SearchResponse>;
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CBA Intelligence Engine</h1>
        <p className="text-gray-600">Analyze collective bargaining agreements with AI-powered insights</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Search CBAs</h2>
        <p className="text-gray-600">Find relevant collective bargaining agreements and clauses</p>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search for specific clauses, terms, or agreements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            onClick={handleSearch}
            disabled={searchMutation.isPending || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Search Results */}
        {searchMutation.data && (
          <div className="mt-4 space-y-2">
            <h3 className="text-lg font-semibold">
              Search Results ({searchMutation.data.total} found)
            </h3>
            {searchMutation.data.results.length === 0 ? (
              <p className="text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
            ) : (
              <div className="space-y-2">
                {searchMutation.data.results.map((cba) => (
                  <div key={cba.id} className="bg-white p-4 rounded-lg shadow border hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-600">{cba.title}</h4>
                        <p className="text-sm text-gray-600">{cba.cbaNumber}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {cba.employerName}
                          </span>
                          <span>•</span>
                          <span>{cba.unionName}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={`inline-block px-2 py-1 rounded text-xs ${
                          cba.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cba.status}
                        </div>
                        <p className="text-gray-500 mt-2">{cba.jurisdiction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Recent CBAs</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Latest analyzed agreements</p>
          
          {isLoadingRecent ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : recentCBAs?.results && recentCBAs.results.length > 0 ? (
            <div className="space-y-3">
              {recentCBAs.results.map((cba) => (
                <div key={cba.id} className="border-l-2 border-blue-600 pl-3">
                  <p className="font-medium text-sm">{cba.title}</p>
                  <p className="text-xs text-gray-500">{cba.employerName}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(cba.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent CBAs to display</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Key Clauses</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Important contractual provisions</p>
          <p className="text-gray-500">No clauses analyzed yet</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Analytics</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">Agreement insights and trends</p>
          <p className="text-gray-500">Analytics will appear here</p>
        </div>
      </div>
    </div>
  );
}

export default CBADashboard;

