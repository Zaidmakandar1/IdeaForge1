import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, Search, Plus, Calendar, FileText, Video } from 'lucide-react';
import { getTeams, joinTeam, leaveTeam, getTeam, sendTeamChat, createTeam, getIdeas } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/config/api';

const Teams = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [myTeams, setMyTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [tab, setTab] = useState('my-teams');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', tags: '', ideaId: '' });
  const [creating, setCreating] = useState(false);
  const [userIdeas, setUserIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    getTeams()
      .then(res => {
        setMyTeams(res.data.myTeams || []);
        setAvailableTeams(res.data.availableTeams || []);
        // Set first team as active for chat by default
        if ((res.data.myTeams || []).length > 0) {
          handleSelectTeam(res.data.myTeams[0]._id);
        }
      })
      .catch(() => setError('Failed to load teams'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSelectTeam = async (teamId) => {
    setChatLoading(true);
    try {
      const res = await getTeam(teamId);
      setActiveTeam(res.data);
      setChatMessages(res.data.chat || []);
      setTab('chat');
    } catch {
      setError('Failed to load team details');
    } finally {
      setChatLoading(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      await joinTeam(teamId);
      // Refresh teams
      const res = await getTeams();
      setMyTeams(res.data.myTeams || []);
      setAvailableTeams(res.data.availableTeams || []);
    } catch {
      setError('Failed to join team');
    }
  };

  const handleLeaveTeam = async (teamId) => {
    try {
      await leaveTeam(teamId);
      // Refresh teams
      const res = await getTeams();
      setMyTeams(res.data.myTeams || []);
      setAvailableTeams(res.data.availableTeams || []);
      setActiveTeam(null);
      setChatMessages([]);
    } catch {
      setError('Failed to leave team');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeTeam) return;
    setSendingMessage(true);
    try {
      const res = await sendTeamChat(activeTeam._id, chatInput);
      setChatMessages(res.data);
      setChatInput('');
    } catch {
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setIdeasLoading(true);
    try {
      const [ideasRes, teamsRes] = await Promise.all([
        getIdeas(),
        getTeams()
      ]);
      const allTeams = [...(teamsRes.data.myTeams || []), ...(teamsRes.data.availableTeams || [])];
      const usedIdeaIds = new Set(
        allTeams
          .filter(team => team.ideaId)
          .map(team => typeof team.ideaId === 'object' ? team.ideaId._id : team.ideaId)
      );
      // Debug logs
      console.log('Fetched ideas:', ideasRes.data);
      console.log('All teams:', allTeams);
      console.log('Used idea IDs:', usedIdeaIds);
      const filteredIdeas = ideasRes.data.filter(
        idea => (idea.owner === user.id || (idea.owner && idea.owner._id === user.id)) && !usedIdeaIds.has(idea._id)
      );
      console.log('Filtered userIdeas:', filteredIdeas);
      setUserIdeas(filteredIdeas);
    } catch (err) {
      console.error('Error fetching ideas or teams:', err);
      setUserIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;
    setCreating(true);
    try {
      await createTeam({
        name: newTeam.name,
        description: newTeam.description,
        tags: newTeam.tags.split(',').map(t => t.trim()).filter(Boolean),
        ideaId: newTeam.ideaId || undefined
      });
      setShowCreateModal(false);
      setNewTeam({ name: '', description: '', tags: '', ideaId: '' });
      // Refresh teams
      const res = await getTeams();
      setMyTeams(res.data.myTeams || []);
      setAvailableTeams(res.data.availableTeams || []);
    } catch {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const isLead = activeTeam?.members?.some(m => m.user?._id === user.id && m.role === 'Lead');

  const handleRemoveMember = async (userIdToRemove: string) => {
    if (!activeTeam) return;
    try {
      const res = await api.post(`/teams/${activeTeam._id}/remove-member`, { userIdToRemove });
      setActiveTeam(res.data);
    } catch (err) {
      // Optionally show error
    }
  };

  // Fetch pending join requests for lead
  useEffect(() => {
    const fetchRequests = async () => {
      if (isLead && activeTeam) {
        setRequestsLoading(true);
        try {
          const res = await api.get(`/teams/${activeTeam._id}/requests`);
          setPendingRequests(res.data.requests || []);
        } catch {}
        setRequestsLoading(false);
      } else {
        setPendingRequests([]);
      }
    };
    fetchRequests();
  }, [isLead, activeTeam]);

  const handleRequestJoin = async (teamId) => {
    setRequestStatus((prev) => ({ ...prev, [teamId]: 'pending' }));
    try {
      await api.post(`/teams/${teamId}/request-join`);
      setRequestStatus((prev) => ({ ...prev, [teamId]: 'requested' }));
    } catch {
      setRequestStatus((prev) => ({ ...prev, [teamId]: 'error' }));
    }
  };

  const handleAcceptRequest = async (userId) => {
    if (!activeTeam) return;
    await api.post(`/teams/${activeTeam._id}/requests/${userId}/accept`);
    setPendingRequests((prev) => prev.filter(u => u._id !== userId));
  };

  const handleRejectRequest = async (userId) => {
    if (!activeTeam) return;
    await api.post(`/teams/${activeTeam._id}/requests/${userId}/reject`);
    setPendingRequests((prev) => prev.filter(u => u._id !== userId));
  };

  if (!user || loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  // Filter available teams by search
  const filteredAvailableTeams = availableTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (team.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-space font-bold gradient-text mb-2">
            Teams & Collaboration
          </h1>
          <p className="text-gray-300">
            Connect with teams, collaborate on projects, and bring ideas to life together.
          </p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass bg-white/5 mb-8">
            <TabsTrigger value="my-teams">My Teams</TabsTrigger>
            <TabsTrigger value="discover">Discover Teams</TabsTrigger>
            <TabsTrigger value="chat" disabled={!activeTeam}>Team Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="my-teams">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTeams.map((team) => (
                <Card key={team._id} className="glass-card hover:bg-white/10 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-space cursor-pointer hover:underline" onClick={() => navigate(`/teams/${team._id}`)}>{team.name}</CardTitle>
                        <p className="text-sm text-gray-300 mt-1">{team.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(team.tags || []).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-white/10 text-white border-white/20"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Team Members</span>
                      </div>
                      <div className="flex -space-x-2">
                        {(team.members || []).map((member, index) => (
                          <Avatar key={index} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.user?.avatar || '/default-avatar.png'} alt={member.user?.name || 'User'} />
                            <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Last activity: {team.updatedAt ? new Date(team.updatedAt).toLocaleString() : ''}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" onClick={() => handleSelectTeam(team._id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                      <Button variant="outline" size="sm" className="glass border-white/20 hover:bg-white/10" onClick={() => handleLeaveTeam(team._id)}>
                        Leave
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Created by: {team.creator?.name || 'Unknown'}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Create New Team Card */}
              <Card className="glass-card border-dashed border-white/20 hover:border-white/40 transition-all duration-300 cursor-pointer" onClick={openCreateModal}>
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="font-space font-semibold mb-2">Create New Team</h3>
                  <p className="text-sm text-gray-400">Start a new project and invite collaborators</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="discover">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search teams by name, skills, or technology..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass border-white/20 focus:border-white/40"
                  />
                </div>
                {/* Filter button not implemented */}
                <Button variant="outline" className="glass border-white/20 hover:bg-white/10">
                  Filter
                </Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAvailableTeams.map((team) => {
                  const isRequested = requestStatus[team._id] === 'requested';
                  const isPending = requestStatus[team._id] === 'pending';
                  const isLeadOfTeam = team.members?.some(
                    m => ((m.user?._id?.toString?.() || m.user?._id || m.user) === user.id && m.role === 'Lead')
                  );
                  return (
                    <Card key={team._id} className="glass-card hover:bg-white/10 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="text-lg font-space">{team.name}</CardTitle>
                        <p className="text-sm text-gray-300">{team.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(team.tags || []).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-white/10 text-white border-white/20"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Current Team</span>
                          </div>
                          <div className="flex -space-x-2 mb-3">
                            {(team.members || []).map((member, index) => (
                              <Avatar key={index} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={member.user?.avatar || '/default-avatar.png'} alt={member.user?.name || 'User'} />
                                <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {team.members?.length || 0} members
                        </span>
                        {/* Request to Join logic */}
                        {team.members?.some(m => m.user?._id === user.id) ? (
                          <span className="text-green-500 text-xs">Member</span>
                        ) : isLeadOfTeam ? null : isRequested ? (
                          <span className="text-yellow-500 text-xs">Request Sent</span>
                        ) : isPending ? (
                          <Button size="sm" disabled>Requesting...</Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            onClick={() => handleRequestJoin(team._id)}
                          >
                            Request to Join
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="chat">
            {chatLoading ? (
              <div className="p-8 text-center">Loading chat...</div>
            ) : activeTeam ? (
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Team Sidebar */}
                <div className="lg:col-span-1">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg font-space">{activeTeam.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Team Members</h4>
                        <div className="space-y-2">
                          {(activeTeam.members || []).map((member, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.user?.avatar || '/default-avatar.png'} alt={member.user?.name || 'User'} />
                                <AvatarFallback>{member.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{member.user?.name || 'User'}</p>
                                <p className="text-xs text-gray-400">{member.role}</p>
                              </div>
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              {isLead && member.user?._id !== user.id && (
                                <button
                                  className="ml-2 text-xs text-red-500 hover:underline"
                                  onClick={() => handleRemoveMember(member.user._id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full glass border-white/20 hover:bg-white/10" disabled>
                          <Video className="h-4 w-4 mr-2" />
                          Start Video Call
                        </Button>
                        <Button variant="outline" size="sm" className="w-full glass border-white/20 hover:bg-white/10" disabled>
                          <FileText className="h-4 w-4 mr-2" />
                          Shared Files
                        </Button>
                      </div>
                      <div className="mb-2 text-xs text-gray-400">
                        Created by: {activeTeam.creator?.name || 'Unknown'}
                      </div>
                      {isLead && pendingRequests.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-bold mb-2">Join Requests</h4>
                          {requestsLoading ? (
                            <div className="text-xs text-gray-400">Loading...</div>
                          ) : (
                            pendingRequests.map((user) => (
                              <div key={user._id} className="flex items-center space-x-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={user.avatar || '/default-avatar.png'} alt={user.name || 'User'} />
                                  <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{user.name}</span>
                                <Button size="sm" className="bg-green-600" onClick={() => handleAcceptRequest(user._id)}>Accept</Button>
                                <Button size="sm" variant="outline" className="text-red-500 border-red-500" onClick={() => handleRejectRequest(user._id)}>Reject</Button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {isLead && (
                        <Button
                          className="w-full mt-4 bg-red-600 hover:bg-red-700"
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                              await api.delete(`/teams/${activeTeam._id}`);
                              setActiveTeam(null);
                              // Optionally refresh teams list
                              const res = await getTeams();
                              setMyTeams(res.data.myTeams || []);
                              setAvailableTeams(res.data.availableTeams || []);
                            }
                          }}
                        >
                          Delete Team
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
                {/* Chat Interface */}
                <div className="lg:col-span-3">
                  <Card className="glass-card h-[600px] flex flex-col">
                    <CardHeader className="border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-space">Team Chat</CardTitle>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-gray-400">{activeTeam.members?.length || 0} online</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {chatMessages.map((message, idx) => {
                          const isMe = message.user === user.id || message.user?._id === user.id;
                          return (
                            <div key={idx} className="flex space-x-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {/* No avatar info, so fallback to initials */}
                                <AvatarFallback>{isMe ? 'Y' : 'M'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-sm">{isMe ? 'You' : 'Member'}</span>
                                  <span className="text-xs text-gray-400">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{message.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                    <div className="p-4 border-t border-white/10">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Type a message..."
                          className="flex-1 glass border-white/20 focus:border-white/40"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                          disabled={chatLoading || sendingMessage}
                        />
                        <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" onClick={handleSendMessage} disabled={chatLoading || sendingMessage}>
                          Send
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">Select a team to view chat.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Team Name"
              value={newTeam.name}
              onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newTeam.description}
              onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
            />
            <Input
              placeholder="Tags (comma separated)"
              value={newTeam.tags}
              onChange={e => setNewTeam({ ...newTeam, tags: e.target.value })}
            />
            <div>
              <label className="block mb-1 text-sm">Link to an Idea (optional)</label>
              <select
                className="w-full p-2 rounded border bg-background text-white"
                value={newTeam.ideaId}
                onChange={e => setNewTeam({ ...newTeam, ideaId: e.target.value })}
                disabled={ideasLoading}
              >
                <option value="">None</option>
                {userIdeas.map(idea => (
                  <option key={idea._id} value={idea._id}>{idea.title}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreateTeam} disabled={creating || !newTeam.name.trim()} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex-1">
                {creating ? 'Creating...' : 'Create Team'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;
