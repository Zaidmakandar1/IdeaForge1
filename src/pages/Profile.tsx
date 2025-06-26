import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import IdeaCard from '@/components/ideas/IdeaCard';
import { Edit, MapPin, Calendar, Globe, Github, Twitter, Linkedin, Users, Lightbulb, MessageSquare, Star } from 'lucide-react';
import { getProfile, updateProfile, getUserStats, getIdeas, getTeams, getMyCommunities, getIdeaComments, uploadAvatar } from '@/services/api';
import { ChartContainer } from '@/components/ui/chart';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [myIdeas, setMyIdeas] = useState([]);
  const [teams, setTeams] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [comments, setComments] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [github, setGithub] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Helper to show dashboard and scroll
  const revealProgress = useCallback(() => {
    setShowDashboard(true);
    setTimeout(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    Promise.all([
      getProfile(),
      getUserStats(),
      getIdeas(),
      getTeams(),
      getMyCommunities()
    ])
      .then(([profileRes, statsRes, ideasRes, teamsRes, commRes]) => {
        setProfile(profileRes.data);
        setBio(profileRes.data.bio || '');
        setLocation(profileRes.data.location || '');
        setWebsite(profileRes.data.website || '');
        setSkills(profileRes.data.skills || []);
        setGithub(profileRes.data.social?.github || '');
        setTwitter(profileRes.data.social?.twitter || '');
        setLinkedin(profileRes.data.social?.linkedin || '');
        setStats(statsRes.data);
        setMyIdeas((ideasRes.data || []).filter(i => {
          if (typeof i.owner === 'object' && i.owner !== null) {
            return i.owner._id === profileRes.data._id;
          }
          return i.owner === profileRes.data._id;
        }));
        setTeams(teamsRes.data.myTeams || []);
        setCommunities(commRes.data.myCommunities || []);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));

    // Show and scroll to progress section if #progress is in the URL
    if (window.location.hash === '#progress') {
      revealProgress();
    }
  }, [user, navigate, revealProgress]);

  // Listen for hash changes (if user navigates to #progress after initial load)
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#progress') {
        revealProgress();
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [revealProgress]);

  const handleSaveProfile = async () => {
    setIsEditing(false);
    try {
      await updateProfile({
        bio,
        location,
        website,
        skills,
        social: { github, twitter, linkedin },
      });
      setProfile({
        ...profile,
        bio,
        location,
        website,
        skills,
        social: { github, twitter, linkedin },
      });
    } catch {
      setError('Failed to update profile');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      const formData = new FormData();
      formData.append('avatar', e.target.files[0]);
      try {
        const res = await uploadAvatar(formData);
        setProfile((prev) => prev ? { ...prev, avatar: res.data.avatar } : prev);
      } catch (err) {
        setError('Failed to upload avatar');
      }
    }
  };

  // Dashboard stats
  const totalIdeas = myIdeas.length;
  const completedIdeas = myIdeas.filter(i => i.progress === 100).length;
  const inProgressIdeas = myIdeas.filter(i => i.progress > 0 && i.progress < 100).length;
  const avgProgress = totalIdeas > 0 ? Math.round(myIdeas.reduce((sum, i) => sum + (i.progress || 0), 0) / totalIdeas) : 0;

  // Data for bubble chart
  const progressData = myIdeas.map((idea, idx) => ({
    x: idx + 1,
    y: idea.progress || 0,
    z: 50,
    name: idea.title,
  }));

  if (!user || loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center mb-4">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 mx-auto mb-2">
                      <AvatarImage src={profile.avatar ? `http://localhost:5050${profile.avatar}` : undefined} alt={profile.name} />
                      <AvatarFallback className="text-2xl">{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <span className="text-xs text-gray-400">Change Avatar</span>
                  </label>
                </div>
                <h2 className="text-xl font-space font-bold mb-1">{profile.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{profile.role || 'User'}</p>
                <div className="flex items-center justify-center text-gray-400 text-sm mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.location}
                </div>
                <div className="flex items-center justify-center text-gray-400 text-sm mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </div>
                {!isEditing ? (
                  <>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">{bio}</p>
                    {skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {skills.map((skill, idx) => (
                            <Badge key={idx} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center space-x-3 mb-4">
                      {github && <a href={github} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="p-2"><Github className="h-4 w-4" /></Button></a>}
                      {twitter && <a href={twitter} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="p-2"><Twitter className="h-4 w-4" /></Button></a>}
                      {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="p-2"><Linkedin className="h-4 w-4" /></Button></a>}
                    </div>
                  </>
                ) : (
                  <>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="glass border-white/20 focus:border-white/40 resize-none mb-4"
                      rows={4}
                    />
                    <Label htmlFor="skills" className="block text-left mb-1">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      value={skills.join(', ')}
                      onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="mb-4"
                      placeholder="e.g. React, Node.js, UI/UX"
                    />
                    <Label htmlFor="github" className="block text-left mb-1">GitHub</Label>
                    <Input
                      id="github"
                      value={github}
                      onChange={e => setGithub(e.target.value)}
                      className="mb-2"
                      placeholder="GitHub profile URL"
                    />
                    <Label htmlFor="twitter" className="block text-left mb-1">Twitter</Label>
                    <Input
                      id="twitter"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                      className="mb-2"
                      placeholder="Twitter profile URL"
                    />
                    <Label htmlFor="linkedin" className="block text-left mb-1">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      className="mb-4"
                      placeholder="LinkedIn profile URL"
                    />
                  </>
                )}
              </CardContent>
            </Card>
            {/* Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space">Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Ideas Posted
                  </span>
                  <span className="font-semibold">{stats?.ideas || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Teams Joined
                  </span>
                  <span className="font-semibold">{stats?.teams || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Communities
                  </span>
                  <span className="font-semibold">{stats?.communities || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Followers
                  </span>
                  <span className="font-semibold">{profile.followers?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Following
                  </span>
                  <span className="font-semibold">{profile.following?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="ideas" className="w-full">
              <TabsList className="grid w-full grid-cols-3 glass bg-white/5 mb-8">
                <TabsTrigger value="ideas">My Ideas</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="communities">Communities</TabsTrigger>
              </TabsList>
              <TabsContent value="ideas">
                <div className="grid md:grid-cols-2 gap-6">
                  {myIdeas.map((idea) => (
                    <IdeaCard key={idea._id} idea={{ ...idea, id: idea._id, author: idea.owner }} />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="teams">
                <div className="space-y-4">
                  {teams.length === 0 ? (
                    <div className="text-gray-400 text-center">You have not joined any teams yet.</div>
                  ) : (
                    teams.map((team) => (
                      <Card key={team._id} className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg font-space">{team.name}</CardTitle>
                          <p className="text-sm text-gray-300 mt-1">{team.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Team Members</span>
                          </div>
                          <div className="flex -space-x-2">
                            {team.members.map((member) => (
                              <Avatar key={member.user._id} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={member.user.avatar ? `http://localhost:5050${member.user.avatar}` : undefined} alt={member.user.name} />
                                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Last activity: {team.updatedAt ? new Date(team.updatedAt).toLocaleString() : ''}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="communities">
                <div className="space-y-4">
                  {communities.length === 0 ? (
                    <div className="text-gray-400 text-center">You have not joined any communities yet.</div>
                  ) : (
                    communities.map((community) => (
                      <Card key={community._id} className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg font-space">{community.name}</CardTitle>
                          <p className="text-sm text-gray-300 mt-1">{community.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">Members: {community.members?.length || 0}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {community.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">#{tag}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Created: {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : ''}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
