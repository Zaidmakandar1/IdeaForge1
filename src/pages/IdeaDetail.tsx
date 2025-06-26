import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageSquare, Bookmark, Share2, Users, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getIdeaById, getIdeaComments, addComment, createTeam, likeIdea, unlikeIdea } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const IdeaDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comment, setComment] = useState('');
  const [idea, setIdea] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', tags: '' });
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ideaRes = await getIdeaById(id);
        setIdea(ideaRes.data);
        setLikesCount(ideaRes.data.likes ? ideaRes.data.likes.length : 0);
        setIsLiked(ideaRes.data.likes ? ideaRes.data.likes.includes(user.id) : false);
        const commentsRes = await getIdeaComments(id);
        setComments(commentsRes.data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load idea or comments.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast, user.id]);

  if (loading) return <div>Loading...</div>;
  if (!idea) return <div>Idea not found.</div>;

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikeIdea(id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await likeIdea(id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update like.' });
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked ? "Idea removed from your saved list" : "Idea saved to your bookmarks",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: idea.title,
        text: idea.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Idea link has been copied to your clipboard.",
      });
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await addComment({ content: comment, ideaId: id });
      setComment('');
      // Refetch comments after posting
      const commentsRes = await getIdeaComments(id);
      setComments(commentsRes.data);
      toast({
        title: "Comment posted!",
        description: "Your comment has been added to the discussion.",
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment.',
      });
    }
  };

  const handleJoinTeam = () => {
    toast({
      title: "Team request sent!",
      description: "Your request to join the team has been sent to the idea creator.",
    });
  };

  const openCreateTeamModal = () => {
    setNewTeam({
      name: idea ? `${idea.title} Team` : '',
      description: idea ? idea.description : '',
      tags: idea && idea.tags ? idea.tags.join(', ') : ''
    });
    setShowCreateTeamModal(true);
  };

  const handleCreateTeamForIdea = async () => {
    if (!newTeam.name.trim()) return;
    setCreatingTeam(true);
    try {
      await createTeam({
        name: newTeam.name,
        description: newTeam.description,
        tags: newTeam.tags.split(',').map(t => t.trim()).filter(Boolean),
        ideaId: idea._id
      });
      setShowCreateTeamModal(false);
      toast({ title: 'Team Created!', description: 'A new team has been created for this idea.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create team.' });
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Idea Header */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={idea.author?.avatar || ''} alt={idea.author?.name || ''} />
                      <AvatarFallback>{idea.author?.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{idea.author?.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-400">{idea.author?.bio || ''}</p>
                      <p className="text-xs text-gray-500">{idea.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBookmark}
                      className={`transition-colors ${isBookmarked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-2xl md:text-3xl font-space font-bold gradient-text">
                    {idea.title}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {idea.description}
                  </div>
                </div>
                
                <Separator className="my-6 bg-white/10" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={`flex items-center space-x-2 transition-colors ${
                        isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{likesCount}</span>
                    </Button>
                    
                    <div className="flex items-center space-x-2 text-gray-400">
                      <MessageSquare className="h-5 w-5" />
                      <span>{idea.comments}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Users className="h-5 w-5" />
                      <span>{idea.teamMembers} team members</span>
                    </div>
                  </div>
                  
                  {idea.lookingForTeam && user && (
                    <Button
                      onClick={handleJoinTeam}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Join Team
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Discussion ({comments.length})</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {user && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Share your thoughts or ideas for collaboration..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="glass border-white/20 focus:border-white/40 resize-none"
                      rows={3}
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!comment.trim()}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </Button>
                  </div>
                )}
                
                <div className="space-y-4">
                  {comments.map((comment, idx) => (
                    <div key={comment.id || idx} className="flex space-x-4">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                        <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <span className="text-xs text-gray-400">{comment.createdAt}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-red-400 p-0 h-auto">
                            <Heart className="h-3 w-3 mr-1" />
                            {comment.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-white p-0 h-auto">
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add this button in the main content, after the idea header or actions */}
            {user && (
              <Button onClick={openCreateTeamModal} className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 w-full">
                Create Team for this Idea
              </Button>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Team Info */}
            {idea.lookingForTeam && (
              <Card className="glass-card border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-lg font-space flex items-center text-green-400">
                    <Users className="h-5 w-5 mr-2" />
                    Looking for Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 mb-4">
                    This idea is actively seeking collaborators! Join the team to help bring this innovation to life.
                  </p>
                  {user && (
                    <Button
                      onClick={handleJoinTeam}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      Request to Join
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Ideas */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space">Related Ideas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Related ideas will be populated here */}
              </CardContent>
            </Card>

            {/* Share */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-space">Share this Idea</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full glass border-white/20 hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Idea
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showCreateTeamModal} onOpenChange={setShowCreateTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team for this Idea</DialogTitle>
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
            <div className="flex space-x-2">
              <Button onClick={handleCreateTeamForIdea} disabled={creatingTeam || !newTeam.name.trim()} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 flex-1">
                {creatingTeam ? 'Creating...' : 'Create Team'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateTeamModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdeaDetail;
