import { useState, useEffect } from 'react';
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
import { getProfile, updateProfile, getUserStats, getIdeas, getTeams, getMyCommunities, getIdeaComments } from '@/services/api';

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
        setStats(statsRes.data);
        setMyIdeas((ideasRes.data || []).filter(i => {
          if (typeof i.owner === 'object' && i.owner !== null) {
            return i.owner._id === profileRes.data._id;
          }
          return i.owner === profileRes.data._id;
        }));
        setTeams(teamsRes.data.myTeams || []);
        setCommunities(commRes.data.myCommunities || []);
        // Optionally, fetch comments for user's ideas
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSaveProfile = async () => {
    setIsEditing(false);
    try {
      await updateProfile({ bio, location, website });
      setProfile({ ...profile, bio, location, website });
    } catch {
      setError('Failed to update profile');
    }
  };

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
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback className="text-2xl">{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-space font-bold mb-1">{profile.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{profile.role || 'User'}</p>
                <div className="flex items-center justify-center text-gray-400 text-sm mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {location}
                </div>
                <div className="flex items-center justify-center text-gray-400 text-sm mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </div>
                {!isEditing ? (
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{bio}</p>
                ) : (
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="glass border-white/20 focus:border-white/40 resize-none mb-4"
                    rows={4}
                  />
                )}
                <div className="flex justify-center space-x-3 mb-4">
                  <Button variant="ghost" size="sm" className="p-2"><Globe className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="p-2"><Github className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="p-2"><Twitter className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="p-2"><Linkedin className="h-4 w-4" /></Button>
                </div>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="w-full glass border-white/20 hover:bg-white/10"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSaveProfile}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="w-full glass border-white/20 hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
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
                                <AvatarImage src={member.user.avatar} alt={member.user.name} />
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
