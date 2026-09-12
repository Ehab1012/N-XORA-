import React, { useState, useEffect } from 'react';
import {
  User,
  UserProfileDetails,
  UserRole,
} from '../../../shared/types.js';
import { api } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { RoleBadge, StatusBadge, PriorityBadge } from '../common/Badges.js';
import { Modal } from '../common/Modal.js';
import {
  Mail,
  MapPin,
  Clock,
  Github,
  Phone,
  Briefcase,
  Layers,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Edit3,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Calendar,
  Shield,
  Loader2,
  Plus,
  X,
  Trophy,
  Award,
  Zap,
  UserCheck,
  Flame,
  Crown,
  ChevronDown,
  User as UserIcon,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { AvatarPickerModal } from './AvatarPickerModal.js';

interface MemberProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenProject?: (projectId: string) => void;
  onSendMessage?: (userId: string, userName: string) => void;
  onProfileUpdated?: (updatedUser: User) => void;
}

export function MemberProfileModal({
  userId,
  isOpen,
  onClose,
  onOpenProject,
  onSendMessage,
  onProfileUpdated,
}: MemberProfileModalProps) {
  const { user: currentUser, role: currentRole, refreshMe } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatusMessage, setEditStatusMessage] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGithubHandle, setEditGithubHandle] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>(undefined);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [changingRank, setChangingRank] = useState(false);
  const [rankSuccessMsg, setRankSuccessMsg] = useState<string | null>(null);

  const fetchProfile = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserProfile(id);
      setProfileData(data);
      initEditState(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  const initEditState = (u: User) => {
    setEditName(u.name || '');
    setEditTitle(u.title || '');
    setEditDepartment(u.department || '');
    setEditLocation(u.location || '');
    setEditBio(u.bio || '');
    setEditStatusMessage(u.statusMessage || '');
    setEditPhone(u.phone || '');
    setEditGithubHandle(u.githubHandle || '');
    setEditTimezone(u.timezone || '');
    setEditSkills(u.skills ? [...u.skills] : []);
    setEditAvatarUrl(u.avatarUrl);
  };

  useEffect(() => {
    if (isOpen && userId) {
      setIsEditing(false);
      fetchProfile(userId);
    } else {
      setProfileData(null);
    }
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const user = profileData?.user;
  const isSelf = currentUser?.id === userId;
  // STRICT RULE: Each member can only edit his own profile
  const canEdit = isSelf;
  const isLeaderOrOwner = currentRole === 'leader' || currentRole === 'owner';
  const canChangeRank = isLeaderOrOwner && !isSelf && user?.role !== 'owner';

  const handleCopyEmail = (emailStr: string) => {
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (!editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditSkills(editSkills.filter((s) => s !== skillToRemove));
  };

  const handleChangeRank = async (newRole: UserRole) => {
    if (!userId || !user) return;
    setChangingRank(true);
    setRankSuccessMsg(null);
    try {
      const res = await api.updateUserRank(userId, newRole);
      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            role: newRole,
          },
        });
      }
      setRankSuccessMsg(`Successfully changed rank to ${newRole === 'leader' ? 'Leader' : newRole === 'member' ? 'Member' : newRole}`);
      if (onProfileUpdated && res.user) {
        onProfileUpdated(res.user);
      }
      setTimeout(() => setRankSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update member rank');
    } finally {
      setChangingRank(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isSelf) return;
    setSaving(true);
    try {
      const updated = await api.updateUserProfile(userId, {
        name: editName.trim(),
        title: editTitle.trim(),
        department: editDepartment.trim(),
        location: editLocation.trim(),
        bio: editBio.trim(),
        statusMessage: editStatusMessage.trim(),
        phone: editPhone.trim(),
        githubHandle: editGithubHandle.trim(),
        timezone: editTimezone.trim(),
        skills: editSkills,
        avatarUrl: editAvatarUrl || '',
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          user: updated,
        });
      }
      setIsEditing(false);
      if (onProfileUpdated) onProfileUpdated(updated);
      if (isSelf) refreshMe();
    } catch (err: any) {
      alert(err.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span>Retrieving member credentials and profile...</span>
        </div>
      ) : error || !user ? (
        <div className="p-8 text-center space-y-3">
          <p className="text-rose-400 text-sm font-medium">{error || 'User profile not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1a1d36] text-slate-200 text-xs hover:bg-[#232746]"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner & Avatar Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1c1438] via-[#121428] to-[#0c0d18] border border-[#2c305c] p-5 sm:p-6 overflow-hidden shadow-xl">
            {/* Background ambient accents */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative group">
                  <div
                    onClick={() => {
                      if (isSelf) setAvatarPickerOpen(true);
                    }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-fuchsia-600 p-[2px] shadow-lg shadow-purple-950/50 relative overflow-hidden ${
                      isSelf ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="w-full h-full bg-[#0d0f1e] rounded-[14px] flex items-center justify-center text-white font-bold text-2xl sm:text-3xl font-display overflow-hidden relative">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      )}

                      {/* Hover overlay for self */}
                      {isSelf && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera className="w-5 h-5 text-purple-300" />
                          <span className="text-[9px] font-mono tracking-tighter mt-0.5 text-purple-200">Change</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Status ping indicator */}
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#0d0f1e]"
                    title="Active Member"
                  />
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => setAvatarPickerOpen(true)}
                      className="sm:hidden absolute -top-1.5 -right-1.5 p-1 rounded-full bg-purple-600 text-white shadow-md"
                      title="Change photo"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                      {user.name}
                    </h2>
                    <RoleBadge role={user.role} />
                    {isSelf && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/40">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-purple-200/90">
                    {user.title || 'Engineering Contributor'}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-purple-400" />
                    <span>{user.department || 'Platform Engineering'}</span>
                    {user.location && (
                      <>
                        <span className="text-slate-600">•</span>
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span>{user.location}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#232746]">
                {!isSelf && onSendMessage && (
                  <button
                    onClick={() => {
                      onClose();
                      onSendMessage(user.id, user.name);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md shadow-purple-950/40 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}

                {/* Leader / Owner Rank Management Action */}
                {canChangeRank && (
                  <div className="flex items-center gap-1.5">
                    {user.role === 'member' ? (
                      <button
                        onClick={() => handleChangeRank('leader')}
                        disabled={changingRank}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-medium shadow-md shadow-amber-950/40 transition-all disabled:opacity-50"
                        title="Promote this member to Leader rank"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{changingRank ? 'Promoting...' : 'Promote to Leader'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChangeRank('member')}
                        disabled={changingRank}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b1e38] hover:bg-[#25294c] border border-amber-500/30 text-amber-200 text-xs font-medium transition-colors disabled:opacity-50"
                        title="Change rank back to Member"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>{changingRank ? 'Updating...' : 'Set as Member'}</span>
                      </button>
                    )}
                  </div>
                )}

                {canEdit && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b1e38] hover:bg-[#25294c] border border-[#2d325a] text-purple-200 text-xs font-medium transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isEditing ? 'View Profile' : 'Edit Profile'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status message banner */}
            {user.statusMessage && !isEditing && (
              <div className="mt-4 pt-3 border-t border-[#232746] flex items-center gap-2 text-xs text-slate-300">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400">Status:</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#0e101c]/80 border border-[#232746] text-slate-200 text-xs">
                  {user.statusMessage}
                </span>
              </div>
            )}

            {/* Overall Score Highlight Banner */}
            {profileData?.score && !isEditing && (
              <div className="mt-4 pt-3 border-t border-[#232746] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-sm">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span>Overall Merit Score</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-300/90 font-semibold">{profileData.score.tier || 'Contributor'}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-bold font-mono text-purple-100">
                        {profileData.score.totalScore}
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold">
                        PTS
                      </span>
                      {profileData.score.rank && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#161832] border border-purple-500/30 text-purple-300">
                          Rank #{profileData.score.rank} of {profileData.score.totalMembers || 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-1 rounded-lg bg-[#0e101c]/90 border border-[#1f2344]">
                    Tasks: <strong className="text-purple-300">+{profileData.score.breakdown.tasksScore}</strong>
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-[#0e101c]/90 border border-[#1f2344]">
                    Proofs: <strong className="text-teal-300">+{profileData.score.breakdown.proofsScore}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* EDIT FORM MODE */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-200 text-xs font-medium">
                  <Edit3 className="w-4 h-4 text-purple-400" />
                  <span>Editing Profile Credentials & Bio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Picture Control Box */}
              <div className="p-4 rounded-xl bg-[#0c0f22] border border-[#232950] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shadow-md">
                    <div className="w-full h-full bg-[#0d0f1e] rounded-[10px] flex items-center justify-center overflow-hidden">
                      {editAvatarUrl ? (
                        <img
                          src={editAvatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg font-display">
                          {editName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 text-xs">Profile Picture</div>
                    <div className="text-[11px] text-slate-400">
                      {editAvatarUrl ? 'Custom photo / avatar active' : 'Default initials avatar'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setAvatarPickerOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload or Pick Avatar</span>
                  </button>
                  {editAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setEditAvatarUrl(undefined)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#161932] hover:bg-[#202446] text-rose-400 hover:text-rose-300 border border-[#262c52] text-xs transition-colors"
                      title="Remove profile photo"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Full Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Professional Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Staff Platform Architect"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Department / Squad</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="e.g. Distributed Security & Zero-Trust"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Location & Timezone</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA (UTC-8)"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Current Status Broadcast</label>
                <input
                  type="text"
                  value={editStatusMessage}
                  onChange={(e) => setEditStatusMessage(e.target.value)}
                  placeholder="e.g. 🟢 Directing Sprint 4 architecture review"
                  className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Professional Mandate & Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Summarize technical responsibilities, domain expertise, and operational focus..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Skills Tag Editor */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Technical Skills & Specialties</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type a skill and press Enter..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-[#0c0d18] border border-[#1f223e]">
                  {editSkills.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No skills listed yet</span>
                  ) : (
                    editSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-purple-400 hover:text-rose-400 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">GitHub Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">@</span>
                    <input
                      type="text"
                      value={editGithubHandle}
                      onChange={(e) => setEditGithubHandle(e.target.value)}
                      placeholder="octocat"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e101c] border border-[#232746] text-slate-100 text-xs focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#202444] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-[#1c1f38]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium shadow-md shadow-purple-900/30"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW PROFILE MODE */
            <div className="space-y-5">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#0d0f1e] border border-[#1f223e]">
                  <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    <span>Active Projects</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {profileData.stats.totalProjects}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0d0f1e] border border-[#1f223e]">
                  <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                    <ListTodo className="w-3 h-3 text-indigo-400" />
                    <span>Tasks Assigned</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {profileData.stats.totalTasksAssigned}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0d0f1e] border border-[#1f223e]">
                  <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Tasks Done</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {profileData.stats.completedTasksCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0d0f1e] border border-[#1f223e]">
                  <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Completion</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                    {profileData.stats.completionRatePercent}%
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#1f2344] gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-purple-500 text-purple-300 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview & Skills
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'projects'
                      ? 'border-purple-500 text-purple-300 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Project Scopes</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono">
                    {profileData.projects.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'tasks'
                      ? 'border-purple-500 text-purple-300 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Assigned Deliverables</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono">
                    {profileData.tasks.length}
                  </span>
                </button>
              </div>

              {/* TAB CONTENT: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Rank update feedback notification */}
                  {rankSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{rankSuccessMsg}</span>
                    </div>
                  )}

                  {/* Leader / Owner Rank Management Governance Card */}
                  {canChangeRank && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#17142b] to-[#121324] border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-white">Leader Governance: Member Rank Assignment</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Leader Action
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        As a workspace leader, you can change this member's rank (e.g. promote from Member to Leader). Profile biography, skills, and personal contacts are strictly edited by the member themselves.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-400 font-mono">Set Rank:</span>
                        <button
                          type="button"
                          onClick={() => handleChangeRank('member')}
                          disabled={changingRank || user.role === 'member'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            user.role === 'member'
                              ? 'bg-purple-900/50 text-purple-200 border border-purple-500/40 ring-1 ring-purple-500/30 cursor-default'
                              : 'bg-[#1b1e38] hover:bg-[#25294c] border border-[#2d325a] text-slate-300'
                          }`}
                        >
                          {user.role === 'member' && <Check className="w-3 h-3 inline mr-1 text-purple-400" />}
                          Member
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeRank('leader')}
                          disabled={changingRank || user.role === 'leader'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            user.role === 'leader'
                              ? 'bg-amber-950/60 text-amber-200 border border-amber-500/50 ring-1 ring-amber-500/30 cursor-default'
                              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-950/40'
                          }`}
                        >
                          {user.role === 'leader' && <Check className="w-3 h-3 inline mr-1 text-amber-300" />}
                          Leader {user.role !== 'leader' && '(Promote)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChangeRank('co-leader')}
                          disabled={changingRank || user.role === 'co-leader'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            user.role === 'co-leader'
                              ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-500/50 ring-1 ring-indigo-500/30 cursor-default'
                              : 'bg-[#1b1e38] hover:bg-[#25294c] border border-[#2d325a] text-slate-300'
                          }`}
                        >
                          {user.role === 'co-leader' && <Check className="w-3 h-3 inline mr-1 text-indigo-300" />}
                          Co-Leader
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Overall Merit Score & Performance Card */}
                  {profileData.score && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1b1535] via-[#101328] to-[#0d0f1e] border border-purple-500/30 shadow-lg shadow-purple-950/30 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232748]">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">
                                Overall Merit & Accountability Score
                              </h4>
                              {profileData.score.tier && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300">
                                  {profileData.score.tier}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Continuous score calculated from completed tasks, on-time delivery, verified proofs, and milestones.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 font-mono bg-[#090b16]/80 px-3.5 py-1.5 rounded-xl border border-purple-500/20">
                          <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-300 to-amber-300">
                            {profileData.score.totalScore}
                          </span>
                          <span className="text-xs font-semibold text-purple-400">PTS</span>
                        </div>
                      </div>

                      {/* Score Formula Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-[#090b16]/70 border border-[#1d203e]">
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Tasks Done</span>
                            <span className="text-purple-400">+25 ea</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between font-mono">
                            <span className="text-base font-bold text-slate-200">
                              {profileData.score.breakdown.tasksCompleted}
                            </span>
                            <span className="text-xs text-purple-300 font-medium">
                              +{profileData.score.breakdown.tasksScore} pts
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#090b16]/70 border border-[#1d203e]">
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>On-Time Speed</span>
                            <span className="text-indigo-400">+15 ea</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between font-mono">
                            <span className="text-base font-bold text-slate-200">
                              {profileData.score.breakdown.onTimeDeliveries}
                            </span>
                            <span className="text-xs text-indigo-300 font-medium">
                              +{profileData.score.breakdown.onTimeScore} pts
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#090b16]/70 border border-[#1d203e]">
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Milestones</span>
                            <span className="text-amber-400">+50 ea</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between font-mono">
                            <span className="text-base font-bold text-slate-200">
                              {profileData.score.breakdown.milestonesCompleted}
                            </span>
                            <span className="text-xs text-amber-300 font-medium">
                              +{profileData.score.breakdown.milestonesScore} pts
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#090b16]/70 border border-[#1d203e]">
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                            <span>Proofs Verified</span>
                            <span className="text-teal-400">+40 ea</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between font-mono">
                            <span className="text-base font-bold text-slate-200">
                              {profileData.score.breakdown.proofsApproved}
                            </span>
                            <span className="text-xs text-teal-300 font-medium">
                              +{profileData.score.breakdown.proofsScore} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <div className="p-4 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                      Mandate & Professional Summary
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {user.bio || 'No professional biography recorded for this member yet.'}
                    </p>
                  </div>

                  {/* Skills Grid */}
                  <div className="p-4 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-2.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                      Technical Competencies & Specializations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/30 text-purple-200 text-xs font-medium"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No specific skills tagged</span>
                      )}
                    </div>
                  </div>

                  {/* Contact & Credentials Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-1 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Workspace Email</span>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-mono select-all truncate">{user.email}</span>
                        <button
                          onClick={() => handleCopyEmail(user.email)}
                          title="Copy email address"
                          className="p-1 rounded text-slate-400 hover:text-purple-300 transition-colors"
                        >
                          {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-1 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">GitHub Profile</span>
                      {user.githubHandle ? (
                        <a
                          href={`https://github.com/${user.githubHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-purple-300 hover:underline font-mono"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>@{user.githubHandle}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 font-mono">Not linked</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-1 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Phone / Direct Line</span>
                      <span className="text-slate-200 font-mono">{user.phone || 'Not provided'}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0c0d18] border border-[#1f223e] space-y-1 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Engineering Squads</span>
                      <div className="text-slate-200 font-medium truncate">
                        {profileData.teams.length > 0
                          ? profileData.teams.map((t) => t.name).join(', ')
                          : 'General Contributor'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PROJECTS */}
              {activeTab === 'projects' && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {profileData.projects.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs font-mono">
                      No project scopes assigned to this member yet.
                    </div>
                  ) : (
                    profileData.projects.map((proj) => {
                      const pct =
                        proj.totalTasks > 0 ? Math.round((proj.completedTasks / proj.totalTasks) * 100) : 0;

                      return (
                        <div
                          key={proj.id}
                          className="p-3.5 rounded-xl bg-[#0c0d18] border border-[#1f223e] hover:border-purple-500/40 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: proj.accentColor || '#a855f7' }}
                              />
                              <span className="font-semibold text-slate-100 truncate">{proj.title}</span>
                              <StatusBadge status={proj.status} />
                              {proj.isLeader && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono">
                                  Lead
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>
                                {proj.completedTasks} / {proj.totalTasks} Tasks Completed
                              </span>
                              <span>•</span>
                              <span>Target: {new Date(proj.deadline).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-20 text-right">
                              <span className="text-[11px] font-mono text-purple-300 font-semibold">{pct}%</span>
                              <div className="w-full bg-[#1e2240] h-1.5 rounded-full overflow-hidden mt-0.5">
                                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            {onOpenProject && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenProject(proj.id);
                                }}
                                className="p-1.5 rounded-lg bg-[#14162a] hover:bg-purple-600 hover:text-white text-slate-400 transition-colors"
                                title="Open project scope"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB CONTENT: TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {profileData.tasks.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs font-mono">
                      No deliverables currently assigned to this member.
                    </div>
                  ) : (
                    profileData.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl bg-[#0c0d18] border border-[#1f223e] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                task.status === 'complete' ? 'bg-emerald-400' : 'bg-purple-400'
                              }`}
                            />
                            <span
                              className={`font-medium truncate ${
                                task.status === 'complete' ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span className="text-purple-400">{task.projectTitle}</span>
                            {task.dueDate && (
                              <>
                                <span>•</span>
                                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <PriorityBadge priority={task.priority} />
                          <StatusBadge status={task.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* BOTTOM ACTION BAR: Chat with Member */}
          <div className="pt-4 mt-6 border-t border-[#1f223f] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d0f1e]/95 p-3.5 rounded-xl border border-[#202446]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Direct Communication Session</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-500/30">
                    Peer-to-Peer
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {isSelf
                    ? 'Your personal workspace account profile'
                    : `Send encrypted messages directly to ${user.name}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isSelf ? (
                <button
                  id="btn-chat-with-member"
                  onClick={() => {
                    onClose();
                    if (onSendMessage) {
                      onSendMessage(user.id, user.name);
                    } else {
                      window.location.hash = `messages/dm/${user.id}`;
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with {user.name}</span>
                </button>
              ) : (
                <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/30">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Your Profile</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#14162a] hover:bg-[#1c203c] border border-[#232746] text-slate-300 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {isSelf && (
        <AvatarPickerModal
          isOpen={avatarPickerOpen}
          onClose={() => setAvatarPickerOpen(false)}
          currentAvatarUrl={editAvatarUrl || user?.avatarUrl}
          userName={user?.name}
          onAvatarUpdated={(newUrl) => {
            setEditAvatarUrl(newUrl);
            if (profileData) {
              setProfileData({
                ...profileData,
                user: {
                  ...profileData.user,
                  avatarUrl: newUrl,
                },
              });
            }
            if (onProfileUpdated && profileData) {
              onProfileUpdated({
                ...profileData.user,
                avatarUrl: newUrl,
              });
            }
          }}
        />
      )}
    </Modal>
  );
}
