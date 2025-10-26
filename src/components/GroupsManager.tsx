import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Mail, Check, X, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export function GroupsManager() {
  const groups = useQuery(api.groups.list);
  const invitations = useQuery(api.groups.listInvitations);
  const createGroup = useMutation(api.groups.create);
  const sendInvitation = useMutation(api.groups.sendInvitation);
  const acceptInvitation = useMutation(api.groups.acceptInvitation);
  const declineInvitation = useMutation(api.groups.declineInvitation);
  const leaveGroup = useMutation(api.groups.leave);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setIsCreating(true);
    try {
      await createGroup({
        name: newGroupName,
        description: newGroupDescription || undefined,
      });
      toast.success("Group created successfully!");
      setNewGroupName("");
      setNewGroupDescription("");
      setShowCreateGroup(false);
    } catch (error) {
      toast.error("Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendInvitation = async (groupId: string) => {
    const email = inviteEmail[groupId];
    if (!email || !email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      await sendInvitation({ groupId: groupId as any, inviteeEmail: email });
      toast.success("Invitation sent!");
      setInviteEmail({ ...inviteEmail, [groupId]: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitation({ id: invitationId as any });
      toast.success("Invitation accepted!");
    } catch (error) {
      toast.error("Failed to accept invitation");
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      await declineInvitation({ id: invitationId as any });
      toast.success("Invitation declined");
    } catch (error) {
      toast.error("Failed to decline invitation");
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to leave "${groupName}"?`)) {
      return;
    }

    try {
      await leaveGroup({ id: groupId as any });
      toast.success("Left group successfully");
    } catch (error) {
      toast.error("Failed to leave group");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 shadow-xl transition-colors duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Linked Accounts & Groups</h2>
        </div>
        <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />

        {invitations && invitations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Pending Invitations</h3>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <motion.div
                  key={inv._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-white/10 border border-white/20 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{inv.group?.name}</p>
                    <p className="text-white/60 text-sm">
                      Invited by {inv.inviter?.email || "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(inv._id)}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-200"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeclineInvitation(inv._id)}
                      className="text-white/60 hover:bg-white/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">My Groups</h3>
            <Button
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Group
            </Button>
          </div>

          {showCreateGroup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 rounded-lg bg-white/10 border border-white/20 space-y-3"
            >
              <div>
                <Label htmlFor="groupName" className="text-white">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Family, Work Team"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label htmlFor="groupDescription" className="text-white">Description (Optional)</Label>
                <Input
                  id="groupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group for?"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateGroup(false)}
                  className="text-white/80 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateGroup}
                  disabled={isCreating}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </motion.div>
          )}

          {groups && groups.length === 0 && !showCreateGroup && (
            <p className="text-white/60 text-sm text-center py-4">
              No groups yet. Create one to start sharing tasks!
            </p>
          )}

          {groups && groups.length > 0 && (
            <div className="space-y-3">
              {groups.map((group) => (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-white/10 border border-white/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{group.name}</h4>
                      {group.description && (
                        <p className="text-white/60 text-sm">{group.description}</p>
                      )}
                      <Badge className="mt-2 bg-white/10 text-white/80 border-white/20">
                        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLeaveGroup(group._id, group.name)}
                      className="text-white/60 hover:text-red-400 hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Leave
                    </Button>
                  </div>

                  <Separator className="my-3 bg-white/20" />

                  <div className="space-y-2">
                    <Label className="text-white text-sm">Invite by Email</Label>
                    <div className="flex gap-2">
                      <Input
                        value={inviteEmail[group._id] || ""}
                        onChange={(e) =>
                          setInviteEmail({ ...inviteEmail, [group._id]: e.target.value })
                        }
                        placeholder="friend@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSendInvitation(group._id)}
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
