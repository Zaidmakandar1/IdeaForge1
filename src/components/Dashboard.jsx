import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, getIdeas, createIdea, updateIdea, deleteIdea } from '../services/api';
import { getSocket } from '../services/socket';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewIdeaForm, setShowNewIdeaForm] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, ideasData] = await Promise.all([
          getCurrentUser(),
          getIdeas()
        ]);
        setUser(userData);
        setIdeas(ideasData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up socket listeners
    const socket = getSocket();
    
    socket.on('userUpdate', (updatedUser) => {
      setUser(updatedUser);
    });

    socket.on('ideaUpdate', (updatedIdea) => {
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => 
          idea._id === updatedIdea._id ? updatedIdea : idea
        )
      );
    });

    socket.on('ideaCreated', (newIdea) => {
      setIdeas(prevIdeas => [newIdea, ...prevIdeas]);
    });

    socket.on('ideaDeleted', (deletedIdeaId) => {
      setIdeas(prevIdeas => prevIdeas.filter(idea => idea._id !== deletedIdeaId));
    });

    return () => {
      socket.off('userUpdate');
      socket.off('ideaUpdate');
      socket.off('ideaCreated');
      socket.off('ideaDeleted');
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreateIdea = async (e) => {
    e.preventDefault();
    try {
      const createdIdea = await createIdea(newIdea);
      setIdeas(prevIdeas => [createdIdea, ...prevIdeas]);
      setShowNewIdeaForm(false);
      setNewIdea({ title: '', description: '', category: '', tags: [] });
    } catch (error) {
      console.error('Failed to create idea:', error);
    }
  };

  const handleUpdateIdea = async (id, updates) => {
    try {
      const updatedIdea = await updateIdea(id, updates);
      setIdeas(prevIdeas =>
        prevIdeas.map(idea => (idea._id === id ? updatedIdea : idea))
      );
    } catch (error) {
      console.error('Failed to update idea:', error);
    }
  };

  const handleDeleteIdea = async (id) => {
    try {
      await deleteIdea(id);
      setIdeas(prevIdeas => prevIdeas.filter(idea => idea._id !== id));
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">IdeaForge Nexus</h1>
            </div>
            <div className="flex items-center">
              {user && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {user.picture && (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Ideas</h2>
            <button
              onClick={() => setShowNewIdeaForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Idea
            </button>
          </div>

          {showNewIdeaForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Idea</h3>
              <form onSubmit={handleCreateIdea}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={newIdea.title}
                      onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newIdea.description}
                      onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={newIdea.category}
                      onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewIdeaForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <div key={idea._id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">{idea.title}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateIdea(idea._id, { status: 'completed' })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleDeleteIdea(idea._id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{idea.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {idea.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(idea.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <img
                      src={idea.owner.picture}
                      alt={idea.owner.name}
                      className="h-6 w-6 rounded-full"
                    />
                    <span className="text-sm text-gray-600">{idea.owner.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 