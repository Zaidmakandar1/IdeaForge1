import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Route, Routes, Link } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Plus, TrendingUp, MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/config/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSocket, initSocket, disconnectSocket } from '@/services/socket';

interface Community {
  _id: string;
  name: string;
  description: string;
  coverImage: string;
  members: number;
  posts: number;
  tags: string[];
  isJoined?: boolean;
  role?: string;
  lastActivity?: string;
  growth?: string;
  trending?: boolean;
  creator?: {
    name: string;
  };
}

interface Post {
  _id: string;
  title: string;
  author: {
    name: string;
  };
  community: {
    name: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
}

const Communities = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [featuredCommunities, setFeaturedCommunities] = useState<Community[]>([]);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  let typingTimeout: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [myCommunitiesRes, featuredCommunitiesRes, topPostsRes] = await Promise.all([
          api.get('/communities/my-communities'),
          api.get('/communities/featured'),
          api.get('/communities/posts/trending')
        ]);

        setMyCommunities(myCommunitiesRes.data.myCommunities || []);
        setFeaturedCommunities(featuredCommunitiesRes.data.featured || []);
        setTopPosts(topPostsRes.data.trending || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load communities data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    let socket;
    if (showChatModal && selectedCommunity) {
      socket = getSocket();
      socket.emit('community:join', selectedCommunity._id);
      // Listen for new messages
      socket.on('community:new_message', (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      });
      // Listen for typing events
      socket.on('community:typing', ({ userName }) => {
        setTypingUser(userName);
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setTypingUser(null), 2000);
      });
      // Listen for online count
      socket.on('community:online', ({ communityId, onlineCount }) => {
        if (selectedCommunity && communityId === selectedCommunity._id) {
          setOnlineCount(onlineCount);
        }
      });
    }
    return () => {
      if (socket && selectedCommunity) {
        socket.emit('community:leave', selectedCommunity._id);
        socket.off('community:new_message');
        socket.off('community:typing');
        socket.off('community:online');
      }
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [showChatModal, selectedCommunity]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleJoinCommunity = async (communityId: string) => {
    try {
      await api.post(`/communities/${communityId}/join`);
      toast.success('Successfully joined the community');
      
      // Update the community in the featured list
      setFeaturedCommunities(prev => 
        prev.map(community => 
          community._id === communityId 
            ? { ...community, isJoined: true }
            : community
        )
      );
    } catch (error) {
      console.error('Error joining community:', error);
      toast.error('Failed to join community');
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    try {
      await api.post(`/communities/${communityId}/leave`);
      toast.success('Successfully left the community');
      
      // Update the community in my communities list
      setMyCommunities(prev => 
        prev.filter(community => community._id !== communityId)
      );
    } catch (error) {
      console.error('Error leaving community:', error);
      toast.error('Failed to leave community');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await api.get(`/communities/search?q=${encodeURIComponent(searchQuery)}`);
      setFeaturedCommunities(response.data);
    } catch (error) {
      console.error('Error searching communities:', error);
      toast.error('Failed to search communities');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedCommunity) return;
    setSendingMessage(true);
    try {
      const socket = getSocket();
      const optimisticMsg = {
        user: { _id: user.id, name: user.name, avatar: user.avatar },
        message: chatInput,
        timestamp: new Date().toISOString(),
        _id: Math.random().toString(36).substr(2, 9),
      };
      setChatMessages((prev) => [...prev, optimisticMsg]);
      socket.emit('community:send_message', {
        communityId: selectedCommunity._id,
        message: chatInput,
      });
      setChatInput('');
    } catch (err) {
      // Optionally show error
    } finally {
      setSendingMessage(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    const socket = getSocket();
    if (selectedCommunity && user?.name) {
      socket.emit('community:typing', { communityId: selectedCommunity._id, userName: user.name });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-space font-bold gradient-text mb-2">
            Communities
          </h1>
          <p className="text-gray-300">
            Join communities, discover ideas, and connect with like-minded innovators worldwide.
          </p>
        </div>

        <Tabs defaultValue="my-communities" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass bg-white/5 mb-8">
            <TabsTrigger value="my-communities">My Communities</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="my-communities">
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading your communities...</p>
                </div>
              ) : myCommunities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">You haven't joined any communities yet.</p>
                  <Button 
                    className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    asChild
                  >
                    <Link to="/communities/discover">Discover Communities</Link>
                  </Button>
                </div>
              ) : (
                myCommunities.map((community) => (
                  <Card key={community._id} className="glass-card overflow-hidden">
                    <div 
                      className="h-32 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${community.coverImage})` }}
                    >
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <h3 className="text-xl font-space font-bold text-white">{community.name}</h3>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-white/80 text-sm flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {Array.isArray(community.members) ? community.members.length : 0} members
                              </span>
                              <span className="text-white/80 text-sm flex items-center">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {community.posts} posts
                              </span>
                              <span className="text-white/80 text-sm flex items-center">
                                Creator: {community.creator?.name || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/20">
                            {community.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-6">
                      <p className="text-gray-300 mb-4 leading-relaxed">{community.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {community.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-white/10 text-white border-white/20"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Last activity: {community.lastActivity}
                        </span>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="glass border-white/20 hover:bg-white/10" onClick={() => navigate(`/communities/${community._id}`)}>
                            <MessageSquare className="h-4 w-4 mr-2" />View Posts
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleLeaveCommunity(community._id)} className="text-red-400 border-red-400/20 hover:bg-red-400/10">Leave</Button>
                          <Button variant="outline" size="sm" className="border-green-400/20 text-green-400 hover:bg-green-400/10" onClick={() => handleJoinCommunity(community._id)}>
                            Join Community
                          </Button>
                          <Button variant="outline" size="sm" className="border-blue-400/20 text-blue-400 hover:bg-blue-400/10" onClick={() => { setSelectedCommunity(community); setShowChatModal(true); }}>
                            Community Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="discover">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search communities by name, topic, or interest..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 glass border-white/20 focus:border-white/40"
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="glass border-white/20 hover:bg-white/10"
                  onClick={handleSearch}
                >
                  Search
                </Button>
                <Button 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  onClick={() => navigate('/communities/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Community
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {loading ? (
                  <div className="col-span-2 text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading communities...</p>
                  </div>
                ) : featuredCommunities.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-400">No communities found.</p>
                  </div>
                ) : (
                  featuredCommunities.map((community) => (
                    <Card key={community._id} className="glass-card overflow-hidden hover:bg-white/5 transition-all duration-300">
                      <div 
                        className="h-24 bg-cover bg-center relative"
                        style={{ backgroundImage: `url(${community.coverImage})` }}
                      >
                        <div className="absolute inset-0 bg-black/50" />
                        {community.trending && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-space font-semibold">{community.name}</h3>
                          {community.growth && (
                            <Badge variant="outline" className="border-green-500/30 text-green-400">
                              {community.growth}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mb-4 leading-relaxed">{community.description}</p>
                        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {community.members}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {community.posts} posts
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {community.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-white/10 text-white border-white/20 text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                          {community.tags.length > 3 && (
                            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs">
                              +{community.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => handleJoinCommunity(community._id)}
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                          disabled={community.isJoined}
                        >
                          {community.isJoined ? 'Joined' : 'Join Community'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trending">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Trending Posts */}
              <div className="lg:col-span-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Trending Posts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="mt-4 text-gray-400">Loading trending posts...</p>
                      </div>
                    ) : topPosts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No trending posts found.</p>
                      </div>
                    ) : (
                      topPosts.map((post) => (
                        <div 
                          key={post._id} 
                          className="p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => navigate(`/posts/${post._id}`)}
                        >
                          <h4 className="font-medium mb-2 hover:gradient-text transition-all">
                            {post.title}
                          </h4>
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <div className="flex items-center space-x-4">
                              <span>by {post.author.name}</span>
                              <Badge variant="outline" className="border-white/20 text-white">
                                {post.community.name}
                              </Badge>
                            </div>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center">
                              <Star className="h-4 w-4 mr-1" />
                              {post.likes}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {post.comments}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Community Stats */}
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-space">Community Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Total Communities</span>
                      <span className="font-semibold">{featuredCommunities.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Active Members</span>
                      <span className="font-semibold">
                        {featuredCommunities.reduce((acc, community) => acc + community.members, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Posts Today</span>
                      <span className="font-semibold">
                        {topPosts.filter(post => {
                          const postDate = new Date(post.createdAt);
                          const today = new Date();
                          return postDate.toDateString() === today.toDateString();
                        }).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">New This Week</span>
                      <span className="font-semibold text-green-400">
                        +{featuredCommunities.filter(community => community.growth).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-space">Suggested for You</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {featuredCommunities.slice(0, 3).map((community) => (
                      <div key={community._id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div 
                          className="w-12 h-12 rounded-lg bg-cover bg-center"
                          style={{ backgroundImage: `url(${community.coverImage})` }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{community.name}</p>
                          <p className="text-xs text-gray-400">{community.members} members</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="glass border-white/20 text-xs"
                          onClick={() => handleJoinCommunity(community._id)}
                          disabled={community.isJoined}
                        >
                          {community.isJoined ? 'Joined' : 'Join'}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Team Modal */}
      <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create or Join a Team for {selectedCommunity?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Team Name</label>
            <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" />
            <label className="block text-sm font-medium">Description</label>
            <Input value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Team Description" />
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600" onClick={() => {/* TODO: Call createTeam API with selectedCommunity._id */ setShowTeamModal(false); }}>Create Team</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
          <Card className="glass-card h-[600px] flex flex-col w-full">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-space">Community Chat: {selectedCommunity?.name}</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">
                      {Array.isArray(selectedCommunity?.members) ? selectedCommunity.members.length : (selectedCommunity?.members || 0)} members
                    </span>
                  </div>
                  <span className="text-sm text-green-400">{onlineCount} online</span>
                </div>
              </div>
              <DialogTitle className="sr-only">Community Chat: {selectedCommunity?.name}</DialogTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {chatLoading ? (
                  <div className="text-center text-gray-400">Loading chat...</div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400">No messages yet. Start the conversation!</div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.user?._id === user?.id || msg.user === user?.id;
                    return (
                      <div key={msg._id || idx} className="flex space-x-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={msg.user?.avatar || '/default-avatar.png'} alt={msg.user?.name || 'User'} />
                          <AvatarFallback>{msg.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{isMe ? 'You' : msg.user?.name || 'Member'}</span>
                            <span className="text-xs text-gray-400">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              {typingUser && (
                <div className="text-xs text-gray-400 px-4 pb-2">{typingUser} is typing...</div>
              )}
            </CardContent>
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  className="flex-1 glass border-white/20 focus:border-white/40"
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  disabled={chatLoading || sendingMessage}
                />
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  onClick={handleSendMessage}
                  disabled={chatLoading || sendingMessage || (!chatInput.trim())}
                >
                  Send
                </Button>
                <Button variant="outline" onClick={() => setShowChatModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DiscoverCommunities = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <h1 className="text-3xl font-bold gradient-text">Discover Communities (Coming Soon)</h1>
  </div>
);

const RoutesComponent = () => (
  <Routes>
    <Route path="/communities/discover" element={<DiscoverCommunities />} />
  </Routes>
);

export { DiscoverCommunities };
export default Communities;
