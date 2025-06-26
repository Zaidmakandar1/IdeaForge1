import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/config/api';

const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [newPostImage, setNewPostImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [likeLoading, setLikeLoading] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [comments, setComments] = useState({});

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const res = await api.get(`/communities/${id}`);
        setCommunity(res.data);
      } catch (err) {
        setError('Community not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchCommunity();
  }, [id]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await api.get(`/communities/${id}/posts`);
        setPosts(res.data);
      } catch (err) {
        // ignore for now
      }
    };
    if (id) fetchPosts();
  }, [id]);

  const handlePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.content);
      if (newPostImage) {
        formData.append('image', newPostImage);
      }
      const res = await api.post(`/communities/${id}/posts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPosts([res.data, ...posts]);
      setShowPostModal(false);
      setNewPost({ title: '', content: '' });
      setNewPostImage(null);
    } catch (err) {
      // handle error
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      await api.post(`/posts/${postId}/like`);
      setPosts((prev) => prev.map((p) => p._id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    } catch {}
    setLikeLoading((prev) => ({ ...prev, [postId]: false }));
  };

  const handleComment = async (postId) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      await api.post('/comments', { postId, content });
      // Fetch comments again
      const res = await api.get(`/comments/post/${postId}`);
      setComments((prev) => ({ ...prev, [postId]: res.data }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch {}
    setCommentLoading((prev) => ({ ...prev, [postId]: false }));
  };

  const fetchComments = async (postId) => {
    try {
      const res = await api.get(`/comments/post/${postId}`);
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    } catch {}
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!community) return <div className="p-8 text-center">Community not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-space font-bold gradient-text">
              {community.name}
            </CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-gray-400 text-sm">
                Created by: {community.creator?.name || 'Unknown'}
              </span>
              <span className="text-gray-400 text-sm">
                on {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4 leading-relaxed">{community.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {community.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                  #{tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-gray-400 text-sm">
                {community.members?.length || 0} members
              </span>
            </div>
            <Button className="mt-2" onClick={() => setShowPostModal(true)}>
              Post an Idea
            </Button>
          </CardContent>
        </Card>
        {/* Post List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post._id} className="glass-card">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author?.avatar || '/default-avatar.png'} alt={post.author?.name || 'User'} />
                    <AvatarFallback>{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{post.author?.name || 'User'}</div>
                    <div className="text-xs text-gray-400">{post.createdAt ? new Date(post.createdAt).toLocaleString() : ''}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <div className="font-bold text-lg mb-1">{post.title}</div>
                  <div className="text-gray-300 mb-2">{post.content}</div>
                  {post.image && (
                    <img src={`http://localhost:5050${post.image}`} alt="Post" className="mb-2 max-h-64 rounded" />
                  )}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <Button size="sm" variant="outline" onClick={() => handleLike(post._id)} disabled={likeLoading[post._id]}>
                    👍 {post.likes || 0}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fetchComments(post._id)}>
                    💬 {post.comments?.length || 0} Comments
                  </Button>
                </div>
                {/* Comments */}
                {comments[post._id] && (
                  <div className="mt-2 space-y-2">
                    {comments[post._id].map((comment) => (
                      <div key={comment._id} className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={comment.author?.avatar || '/default-avatar.png'} alt={comment.author?.name || 'User'} />
                          <AvatarFallback>{comment.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-xs font-medium">{comment.author?.name || 'User'}</div>
                          <div className="text-xs text-gray-400">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</div>
                          <div className="text-sm text-gray-300">{comment.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add Comment */}
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentInputs[post._id] || ''}
                    onChange={e => setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleComment(post._id); }}
                    disabled={commentLoading[post._id]}
                  />
                  <Button size="sm" onClick={() => handleComment(post._id)} disabled={commentLoading[post._id]}>
                    Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Post Modal */}
        <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post an Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={newPost.title}
                onChange={e => setNewPost({ ...newPost, title: e.target.value })}
              />
              <Input
                placeholder="Content"
                value={newPost.content}
                onChange={e => setNewPost({ ...newPost, content: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={e => setNewPostImage(e.target.files[0])}
              />
              <div className="flex space-x-2">
                <Button onClick={handlePost} disabled={posting || !newPost.title.trim() || !newPost.content.trim()} className="flex-1">
                  {posting ? 'Posting...' : 'Post'}
                </Button>
                <Button variant="outline" onClick={() => { setShowPostModal(false); setNewPostImage(null); }} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CommunityDetail; 