import axios from 'axios';

const API_URL = 'http://localhost:5050';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- AUTH ---
export const signup = (data) => api.post('/auth/signup', data);
export const login = (data) => api.post('/auth/login', data);
export const googleLogin = () => { window.location.href = `${API_URL}/auth/google`; };
export const logout = () => api.get('/auth/logout');

// --- USER ---
export const getProfile = () => api.get('/api/users/profile');
export const updateProfile = (data) => api.put('/api/users/profile', data);
export const getUserStats = () => api.get('/api/users/stats');
export const followUser = (id) => api.post(`/api/users/${id}/follow`);
export const unfollowUser = (id) => api.post(`/api/users/${id}/unfollow`);
export const getAllUsers = () => api.get('/api/users');

// --- IDEAS ---
export const getIdeas = () => api.get('/api/ideas');
export const createIdea = (data) => api.post('/api/ideas', data);
export const updateIdea = (id, data) => api.put(`/api/ideas/${id}`, data);
export const deleteIdea = (id) => api.delete(`/api/ideas/${id}`);
export const addCollaborator = (id, userId) => api.post(`/api/ideas/${id}/collaborators`, { userId });
export const getIdeaById = (id) => api.get(`/api/ideas/${id}`);
export const likeIdea = (id) => api.post(`/api/ideas/${id}/like`);
export const unlikeIdea = (id) => api.post(`/api/ideas/${id}/unlike`);

// --- TEAMS ---
export const getTeams = () => api.get('/api/teams');
export const createTeam = (data) => api.post('/api/teams', data);
export const joinTeam = (id) => api.post(`/api/teams/${id}/join`);
export const leaveTeam = (id) => api.post(`/api/teams/${id}/leave`);
export const getTeam = (id) => api.get(`/api/teams/${id}`);
export const sendTeamChat = (id, message) => api.post(`/api/teams/${id}/chat`, { message });
export const updateTeam = (id, data) => api.put(`/api/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/api/teams/${id}`);

// --- COMMUNITIES ---
export const getCommunities = () => api.get('/api/communities');
export const createCommunity = (data) => api.post('/api/communities', data);
export const joinCommunity = (id) => api.post(`/api/communities/${id}/join`);
export const leaveCommunity = (id) => api.post(`/api/communities/${id}/leave`);
export const getCommunity = (id) => api.get(`/api/communities/${id}`);
export const createCommunityPost = (id, data) => api.post(`/api/communities/${id}/posts`, data);
export const getCommunityPosts = (id) => api.get(`/api/communities/${id}/posts`);
export const updateCommunity = (id, data) => api.put(`/api/communities/${id}`, data);
export const deleteCommunity = (id) => api.delete(`/api/communities/${id}`);
export const getTrendingFeaturedCommunities = () => api.get('/api/communities/trending/featured');
export const getMyCommunities = () => api.get('/api/communities/my-communities');

// --- COMMENTS ---
export const addComment = (data) => api.post('/api/comments', data); // { content, ideaId|postId }
export const editComment = (id, content) => api.put(`/api/comments/${id}`, { content });
export const deleteComment = (id) => api.delete(`/api/comments/${id}`);
export const getIdeaComments = (ideaId) => api.get(`/api/comments/idea/${ideaId}`);
export const getPostComments = (postId) => api.get(`/api/comments/post/${postId}`);

// --- NOTIFICATIONS ---
export const getNotifications = () => api.get('/api/notifications');
export const markNotificationRead = (id) => api.post(`/api/notifications/${id}/read`);

export default api; 