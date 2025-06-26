import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import IdeaCard from '@/components/ideas/IdeaCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getIdeas, getCommunities, getTrendingFeaturedCommunities } from '@/services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [ideas, setIdeas] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    Promise.all([
      getIdeas(),
      getCommunities(),
      getTrendingFeaturedCommunities()
    ])
      .then(([ideasRes, commRes, trendingRes]) => {
        setIdeas(ideasRes.data || []);
        setCommunities(commRes.data.myCommunities || []);
        // For trending tags, you may want to extract from ideas or trendingRes
        setTrendingTags(trendingRes.data.trending?.flatMap(c => c.tags) || []);
      })
      .catch((err) => {
        setError('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const filters = [
    { id: 'all', label: 'All Ideas', count: ideas.length },
    // You can add more filters based on backend data
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/create">
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Idea
                  </Button>
                </Link>
                <Link to="/teams">
                  <Button variant="outline" className="w-full glass border-white/20 hover:bg-white/10">
                    <Users className="h-4 w-4 mr-2" />
                    Find Teams
                  </Button>
                </Link>
                <Link to="/communities">
                  <Button variant="outline" className="w-full glass border-white/20 hover:bg-white/10">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Join Communities
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Communities */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space">My Communities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {communities.slice(0, 3).map((community, index) => (
                  <div key={community._id || index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm`}>
                      {community.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{community.name}</p>
                      <p className="text-xs text-gray-400">{community.members?.length || 0} members</p>
                    </div>
                  </div>
                ))}
                <Link to="/communities">
                  <Button variant="ghost" className="w-full text-sm text-indigo-400 hover:text-indigo-300">
                    View All Communities
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Trending Tags */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trending Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.map((tag, i) => (
                    <Badge
                      key={tag + i}
                      variant="secondary"
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-space font-bold gradient-text mb-2">
                Welcome back, {user.name}!
              </h1>
              <p className="text-gray-300">
                Discover amazing ideas, connect with innovators, and turn creativity into reality.
              </p>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className={
                    activeFilter === filter.id
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                      : "glass border-white/20 hover:bg-white/10"
                  }
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-70">({filter.count})</span>
                </Button>
              ))}
            </div>
            {/* Ideas Feed */}
            <div className="space-y-6">
              {ideas.map((idea) => (
                <IdeaCard key={idea._id} idea={{ ...idea, id: idea._id, author: idea.owner }} />
              ))}
            </div>
            {/* Load More */}
            <div className="text-center mt-8">
              <Button variant="outline" className="glass border-white/20 hover:bg-white/10">
                Load More Ideas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
