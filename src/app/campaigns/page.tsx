'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Send, Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@/types/campaign';
import CustomToggle from '@/components/ui/custom-toggle';
import { useAuth } from '@/contexts/AuthContext';

export default function CampaignsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAutoReply, setUpdatingAutoReply] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const campaignsPerPage = 10;

  useEffect(() => {
    if (!authLoading && user) {
      loadCampaigns();
    }
  }, [authLoading, user]);

  const loadCampaigns = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/list?page=${page}&limit=${campaignsPerPage}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch campaigns');
      }
      
      setCampaigns(result.data || []);
      setTotalCampaigns(result.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse UTC date and convert to local time
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAutoReplyToggle = async (campaignId: string, currentValue: boolean) => {
    setUpdatingAutoReply(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/auto-reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auto_reply: !currentValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update auto reply');
      }

      // Update the local state
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, auto_reply: !currentValue }
            : campaign
        )
      );
    } catch (error) {
      console.error('Error updating auto reply:', error);
      alert('Failed to update auto reply setting');
    } finally {
      setUpdatingAutoReply(null);
    }
  };



  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your WhatsApp bulk messaging campaigns
          </p>
        </div>
        <Button 
          onClick={() => router.push('/campaigns/new')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Campaigns Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading campaigns...</p>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <Send className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first WhatsApp campaign to get started
          </p>
          <Button onClick={() => router.push('/campaigns/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Auto Reply</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{campaign.template_name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CustomToggle
                        checked={campaign.auto_reply || false}
                        onCheckedChange={() => handleAutoReplyToggle(campaign.id, campaign.auto_reply || false)}
                        disabled={updatingAutoReply === campaign.id}
                        label={updatingAutoReply === campaign.id ? 'Updating...' : ''}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.scheduled_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(campaign.scheduled_at)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Immediate</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(campaign.created_date)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalCampaigns > campaignsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center text-sm text-muted-foreground">
                Showing {((currentPage - 1) * campaignsPerPage) + 1} to {Math.min(currentPage * campaignsPerPage, totalCampaigns)} of {totalCampaigns} campaigns
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadCampaigns(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(totalCampaigns / campaignsPerPage) }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === Math.ceil(totalCampaigns / campaignsPerPage) || 
                      Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => loadCampaigns(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadCampaigns(currentPage + 1)}
                  disabled={currentPage === Math.ceil(totalCampaigns / campaignsPerPage)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}