import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  UserPlus,
  Trash2,
  FolderGit2,
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  MapPin,
  Briefcase,
  ExternalLink,
  MessageSquare,
  Sparkles,
  UserCheck,
  ChevronRight,
  Layers,
  Trophy,
  Crown,
} from 'lucide-react';
import { Team, User, Project, UserRole } from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge } from '../common/Badges.js';
import { Modal, ConfirmModal } from '../common/Modal.js';
import { MemberProfileModal } from '../profile/MemberProfileModal.js';

interface TeamsViewProps {
  onNavigateToProjects?: (teamId?: string) => void;
  onOpenProject?: (projectId: string) => void;
  onSendMessage?: (userId: string, userName: string) => void;
}

export function TeamsView({
  onNavigateToProjects,
  onOpenProject,
  onSendMessage,
}: TeamsViewProps = {}) {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'teams' | 'profiles'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile modal state
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Search & Filter for Profiles Directory
  const [profileSearch, setProfileSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  const [inviteModalTeam, setInviteModalTeam] = useState<Team | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');

  const [removeTarget, setRemoveTarget] = useState<{ teamId: string; userId: string; userName: string } | null>(null);

  const canManage = role === 'owner' || role === 'leader';

  const fetchData = async () => {
    try {
      const [tList, pList, uList] = await Promise.all([
        api.getTeams(),
        api.getProjects(),
        api.getUsers(),
      ]);
      setTeams(tList);
      setProjects(pList);
      setUsers(uList);
    } catch (err) {
      console.error('Failed to fetch teams & members data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenProfile = (uId: string) => {
    setSelectedProfileUserId(uId);
    setIsProfileModalOpen(true);
  };

  const handleChangeRole = async (targetUser: User, newRole: UserRole) => {
    if (!canManage) return;
    try {
      const res = await api.updateUserRank(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err.message || `Failed to change role to ${newRole}`);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    await api.createTeam({
      name: newTeamName.trim(),
      description: newTeamDesc.trim(),
    });

    setNewTeamName('');
    setNewTeamDesc('');
    setIsCreateTeamOpen(false);
    fetchData();
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModalTeam) return;

    await api.addTeamMember(inviteModalTeam.id, {
      userId: inviteUserId || undefined,
      email: inviteEmail || undefined,
    });

    setInviteEmail('');
    setInviteUserId('');
    setInviteModalTeam(null);
    fetchData();
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    await api.removeTeamMember(removeTarget.teamId, removeTarget.userId);
    setRemoveTarget(null);
    fetchData();
  };

  // Distinct departments for filter
  const departments = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  ) as string[];

  // Filtered members list
  const filteredUsers = users.filter((u) => {
    const q = profileSearch.toLowerCase();
    const matchesSearch =
      !profileSearch ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.skills && u.skills.some((s) => s.toLowerCase().includes(q)));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-xs">
        Loading teams and membership roster...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-100 tracking-tight">
            Teams & Members
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Role-bounded engineering squads and comprehensive workspace member credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Tab Selector */}
          <div className="inline-flex p-1 rounded-xl bg-[#0e101d] border border-[#232746]">
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'teams'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Squads ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'profiles'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Member Profiles ({users.length})
            </button>
          </div>

          {canManage && activeTab === 'teams' && (
            <button
              onClick={() => setIsCreateTeamOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </div>

      {/* SQUADS VIEW */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => {
            const leader = users.find((u) => u.id === team.leaderId);
            const coLeader = users.find((u) => u.id === team.coLeaderId);
            const teamProjects = projects.filter((p) => p.teamId === team.id);

            return (
              <div
                key={team.id}
                className="glass-panel p-6 rounded-2xl border border-[#202444] space-y-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-slate-100">{team.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{team.description}</p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setInviteModalTeam(team)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14162a] border border-[#232746] hover:border-purple-500/40 text-purple-300 text-xs font-medium transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  {/* Team Leadership with clickable profiles */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#1c1f38] text-xs">
                    <div
                      onClick={() => leader && handleOpenProfile(leader.id)}
                      className="cursor-pointer p-2 rounded-xl hover:bg-[#15172c] border border-transparent hover:border-purple-500/30 transition-all group"
                      title="Click to view Squad Leader profile"
                    >
                      <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Squad Leader</span>
                      <div className="font-medium text-slate-200 group-hover:text-purple-300 transition-colors flex items-center gap-1">
                        <span>{leader ? leader.name : 'Not assigned'}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <span className="text-[10px] text-purple-300 font-mono truncate block">{leader?.title || leader?.email}</span>
                    </div>

                    <div
                      onClick={() => coLeader && handleOpenProfile(coLeader.id)}
                      className={`p-2 rounded-xl transition-all ${
                        coLeader
                          ? 'cursor-pointer hover:bg-[#15172c] border border-transparent hover:border-purple-500/30 group'
                          : ''
                      }`}
                      title={coLeader ? 'Click to view Co-Leader profile' : undefined}
                    >
                      <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Co-Leader</span>
                      <div className="font-medium text-slate-200 group-hover:text-purple-300 transition-colors flex items-center gap-1">
                        <span>{coLeader ? coLeader.name : 'None'}</span>
                        {coLeader && (
                          <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                        )}
                      </div>
                      <span className="text-[10px] text-fuchsia-300 font-mono truncate block">{coLeader?.title || coLeader?.email || '—'}</span>
                    </div>
                  </div>

                  {/* Member roster */}
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase text-slate-400">
                        Assigned Contributors ({team.memberIds.length})
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {team.memberIds.map((mId) => {
                        const memberUser = users.find((u) => u.id === mId);
                        return (
                          <div
                            key={mId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c0d18] border border-[#1a1c32] hover:border-purple-500/40 text-xs transition-colors group cursor-pointer"
                            onClick={() => memberUser && handleOpenProfile(memberUser.id)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                {memberUser ? memberUser.name[0] : 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                                  {memberUser ? memberUser.name : mId}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  {memberUser?.title || memberUser?.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              {memberUser && <RoleBadge role={memberUser.role} />}
                              {canManage && (
                                <button
                                  onClick={() =>
                                    setRemoveTarget({
                                      teamId: team.id,
                                      userId: mId,
                                      userName: memberUser ? memberUser.name : mId,
                                    })
                                  }
                                  title="Remove member from team"
                                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Projects in this team */}
                <div className="pt-3 border-t border-[#1c1f38] text-xs text-slate-400 flex items-center justify-between">
                  <button
                    onClick={() => onNavigateToProjects && onNavigateToProjects(team.id)}
                    className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-left group"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{teamProjects.length} Active Project Scopes</span>
                    <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→ View</span>
                  </button>
                  <span className="font-mono text-[10px] text-slate-500">{team.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MEMBER PROFILES DIRECTORY VIEW */}
      {activeTab === 'profiles' && (
        <div className="space-y-5">
          {/* Search and Filters Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-[#202444] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Search members by name, title, department, or technical skill..."
                className="w-full bg-[#0c0d18] border border-[#232746] rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#0c0d18] border border-[#232746] rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-purple-500 capitalize"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owners</option>
                <option value="leader">Leaders</option>
                <option value="co-leader">Co-Leaders</option>
                <option value="member">Members</option>
              </select>

              {departments.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-[#0c0d18] border border-[#232746] rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Member Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((member) => {
              const memberTeams = teams.filter((t) => t.memberIds.includes(member.id));
              const memberProjects = projects.filter(
                (p) => p.memberIds.includes(member.id) || p.leaderId === member.id
              );
              const isCurrentUser = user?.id === member.id;

              return (
                <div
                  key={member.id}
                  onClick={() => handleOpenProfile(member.id)}
                  className="glass-panel p-5 rounded-2xl border border-[#202444] hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-950/20 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle hover gradient glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-600/15 transition-all" />

                  <div className="space-y-4">
                    {/* Member Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shadow-md shadow-purple-950/40">
                            <div className="w-full h-full bg-[#0d0f1e] rounded-[10px] flex items-center justify-center font-bold text-white font-display text-base">
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="w-full h-full rounded-[10px] object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                              )}
                            </div>
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0d0f1e]"
                            title="Active Status"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                              {member.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-purple-200/80 truncate font-medium">
                            {member.title || 'Engineering Contributor'}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {member.department || 'Core Engineering'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <RoleBadge role={member.role} />
                        {typeof member.overallScore === 'number' && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-semibold"
                            title="Overall Contributor Merit Score"
                          >
                            <Trophy className="w-2.5 h-2.5 text-amber-400" />
                            <span>{member.overallScore} pts</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Broadcast message */}
                    {member.statusMessage && (
                      <div className="p-2 rounded-lg bg-[#0c0d18] border border-[#1b1e36] text-[11px] text-slate-300 truncate">
                        {member.statusMessage}
                      </div>
                    )}

                    {/* Skills Chips */}
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-[#121426] border border-[#232746] text-purple-300 text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {member.skills.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#121426] border border-[#232746] text-slate-400 text-[10px]">
                            +{member.skills.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metadata & Actions */}
                  <div className="pt-4 mt-4 border-t border-[#1c1f38] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span title="Assigned Project Scopes" className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" />
                        <span className="font-mono text-slate-200">{memberProjects.length}</span> scopes
                      </span>
                      <span>•</span>
                      <span title="Squad Membership" className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-indigo-400" />
                        <span className="font-mono text-slate-200">{memberTeams.length}</span> squad
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isCurrentUser && onSendMessage && (
                        <button
                          onClick={() => onSendMessage(member.id, member.name)}
                          title="Direct Message"
                          className="p-1.5 rounded-lg bg-[#14162a] hover:bg-purple-600 hover:text-white text-slate-400 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && !isCurrentUser && member.role !== 'owner' && (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member, e.target.value as any)}
                          className="bg-[#14162a] hover:bg-[#1a1d36] border border-[#232746] hover:border-purple-500/50 rounded-lg py-1 px-2 text-[11px] font-medium text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
                        >
                          <option value="member">Member</option>
                          <option value="co-leader">Co-Leader</option>
                          <option value="leader">Leader</option>
                        </select>
                      )}
                      <button
                        onClick={() => handleOpenProfile(member.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#14162a] group-hover:bg-purple-600/30 group-hover:border-purple-500/50 border border-[#232746] text-purple-300 text-xs font-medium transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="glass-panel p-12 text-center rounded-2xl border border-[#202444] space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-slate-300 text-sm font-medium">No members match the selected filters</p>
              <button
                onClick={() => {
                  setProfileSearch('');
                  setRoleFilter('all');
                  setDepartmentFilter('all');
                }}
                className="text-xs text-purple-400 hover:underline"
              >
                Clear search filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full Member Profile Modal */}
      <MemberProfileModal
        userId={selectedProfileUserId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileUserId(null);
        }}
        onOpenProject={onOpenProject}
        onSendMessage={onSendMessage}
        onProfileUpdated={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        }}
      />

      {/* Create Team Modal */}
      <Modal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} title="Create Engineering Team">
        <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Team Name *</label>
            <input
              type="text"
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Distributed Security Research"
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Mandate / Description</label>
            <textarea
              rows={3}
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              placeholder="Domain scope and technical responsibilities..."
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateTeamOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
            >
              Create Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={!!inviteModalTeam}
        onClose={() => setInviteModalTeam(null)}
        title={`Add Member to ${inviteModalTeam?.name}`}
      >
        <form onSubmit={handleInviteMember} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Select from Workspace Roster</label>
            <select
              value={inviteUserId}
              onChange={(e) => {
                setInviteUserId(e.target.value);
                setInviteEmail('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            >
              <option value="">-- Choose User --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email} • {u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="text-center text-slate-500 font-mono text-[10px]">OR INVITE BY EMAIL</div>

          <div>
            <label className="block text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="newmember@nexora.internal"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteUserId('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setInviteModalTeam(null)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inviteUserId && !inviteEmail}
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
            >
              Add to Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove confirmation dialog */}
      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Member from Team"
        message={`Are you sure you want to remove ${removeTarget?.userName} from this team? Their existing task assignments will remain recorded in the audit log.`}
        confirmLabel="Remove Member"
        destructive
      />
    </div>
  );
}
