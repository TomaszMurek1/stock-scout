import React, { useState, useEffect } from "react";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { 
  TextField, 
  MenuItem, 
  Button as MuiButton, 
  CircularProgress,
  IconButton,
  Chip,
  Tooltip
} from "@mui/material";
import { Copy, CheckCircle, XCircle, Info } from "lucide-react";
import { toast } from "react-toastify";
import { createInvitation, listInvitations, Invitation, InvitationCreateRequest } from "@/services/adminService";
import { useUserScope } from "@/hooks/useUserScope";

const SCOPE_LABELS = {
  admin: "Admin",
  demo: "Demo",
  paid_access: "Paid Access",
  basic_access: "Basic Access",
  read_only: "Read Only",
};

const SCOPE_COLORS = {
  admin: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  demo: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  paid_access: { bg: "#fae8ff", text: "#86198f", border: "#e9d5ff" },
  basic_access: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  read_only: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
};

export default function InvitationManager() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { isAdmin } = useUserScope();
  
  // Form state
  const [scope, setScope] = useState<InvitationCreateRequest["scope"]>("basic_access");
  const [maxUses, setMaxUses] = useState(1);
  const [durationDays, setDurationDays] = useState(7);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await listInvitations();
      setInvitations(response.data);
    } catch (error) {
      toast.error("Failed to load invitations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin()) {
      toast.error("Demo users can view invitations but cannot create them. Contact an admin for full access.");
      return;
    }
    
    try {
      setCreating(true);
      await createInvitation({
        scope,
        max_uses: maxUses,
        duration_days: durationDays,
      });
      toast.success("Invitation created successfully!");
      loadInvitations();
      // Reset form
      setScope("basic_access");
      setMaxUses(1);
      setDurationDays(7);
    } catch (error) {
      toast.error("Failed to create invitation");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const copyInvitationLink = (code: string) => {
    if (!isAdmin()) {
      toast.info("Demo users cannot copy invitation links");
      return;
    }
    const url = `${window.location.origin}/signin?invitation_code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invitation link copied to clipboard!");
  };

  const copyCode = (code: string) => {
    if (!isAdmin()) {
      toast.info("Demo users cannot copy invitation codes");
      return;
    }
    navigator.clipboard.writeText(code);
    toast.success("Invitation code copied to clipboard!");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (invitation: Invitation) => {
    return false;
  };

  const getRemainingUses = (invitation: Invitation) => {
    return invitation.max_uses - invitation.used_count;
  };

  const anonymizeCode = (code: string) => {
    // Show only first 1 and last 1 character for demo users
    // Note: Backend already anonymizes for demo users, this is a fallback
    if (!isAdmin()) {
      if (code.length <= 2) return "••••";
      return `${code.charAt(0)}••••${code.charAt(code.length - 1)}`;
    }
    return code;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FormCardGenerator
        title="Invitation Management"
        subtitle="Create and manage user invitations with role-based access control."
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateInvitation} className="space-y-6">
          {!isAdmin() && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> You can view all invitations but cannot create new ones. 
                This is a read-only preview of the admin interface.
              </div>
            </div>
          )}
          
          <div className="grid md:grid-cols-3 gap-4">
            <TextField
              select
              label="Access Scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              size="small"
              fullWidth
              disabled={!isAdmin()}
            >
              <MenuItem value="read_only">Read Only</MenuItem>
              <MenuItem value="basic_access">Basic Access</MenuItem>
              <MenuItem value="paid_access">Paid Access</MenuItem>
              <MenuItem value="demo">Demo (View Admin)</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>

            <TextField
              label="Max Uses"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value))}
              size="small"
              fullWidth
              inputProps={{ min: 1 }}
              helperText="Number of users who can register"
              disabled={!isAdmin()}
            />

            <TextField
              label="Duration (days)"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value))}
              size="small"
              fullWidth
              inputProps={{ min: 1 }}
              helperText="Access duration from registration"
              disabled={!isAdmin()}
            />
          </div>

          <div>
            <Tooltip 
              title={!isAdmin() ? "Demo users cannot create invitations" : ""}
              arrow
            >
              <span>
                <MuiButton
                  type="submit"
                  variant="contained"
                  className="bg-slate-700 hover:bg-slate-800"
                  disabled={creating || !isAdmin()}
                  startIcon={creating ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {creating ? "Creating..." : "Create Invitation"}
                </MuiButton>
              </span>
            </Tooltip>
          </div>
        </form>

        {/* Invitations List */}
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">All Invitations</h3>
          
          {loading ? (
            <p className="text-center text-slate-500 py-8">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No invitations created yet.</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Code and Scope */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Code:</span>
                          <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                            {anonymizeCode(invitation.code)}
                          </code>
                          {isAdmin() && (
                            <IconButton
                              size="small"
                              onClick={() => copyCode(invitation.code)}
                              aria-label="Copy code"
                            >
                              <Copy className="w-4 h-4" />
                            </IconButton>
                          )}
                        </div>
                        
                        <Chip
                          label={SCOPE_LABELS[invitation.scope]}
                          size="small"
                          sx={{
                            backgroundColor: SCOPE_COLORS[invitation.scope].bg,
                            color: SCOPE_COLORS[invitation.scope].text,
                            borderColor: SCOPE_COLORS[invitation.scope].border,
                            border: "1px solid",
                          }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600">
                        <span>
                          Usage: <strong>{invitation.used_count} / {invitation.max_uses}</strong>
                          <span className="text-slate-400 ml-1">
                            ({getRemainingUses(invitation)} left)
                          </span>
                        </span>
                        <span>Duration: <strong>{invitation.duration_days} days</strong></span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {invitation.is_active && !isExpired(invitation) ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">
                              {isExpired(invitation) ? "Expired" : "Inactive"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {isAdmin() && (
                      <div>
                        <MuiButton
                          variant="outlined"
                          size="small"
                          onClick={() => copyInvitationLink(invitation.code)}
                        >
                          Copy Link
                        </MuiButton>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormCardGenerator>
    </div>
  );
}
