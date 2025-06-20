// src/pages/FeedPage/FeedPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './FeedPage.css'; // We'll create this CSS file next

const FeedPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postError, setPostError] = useState('');
  const [createPostError, setCreatePostError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = useCallback(async (page = 1) => {
    setLoadingPosts(true);
    setPostError('');
    try {
      const response = await axios.get(`/api/posts?page=${page}&limit=10`);
      if (page === 1) {
        setPosts(response.data.posts);
      } else {
        // Append new posts if it's not the first page (for load more)
        // Or replace if it's a direct page jump (simpler for now: replace)
        setPosts(response.data.posts);
      }
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setPostError('Failed to load posts. Please try again later.');
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(currentPage);
  }, [fetchPosts, currentPage]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      setCreatePostError('Post cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setCreatePostError('');
    try {
      const response = await axios.post('/api/posts', { text: newPostText });
      // Add new post to the top of the list & reset form
      setPosts(prevPosts => [response.data, ...prevPosts]);
      setNewPostText('');
      // If on page 1, this new post might push total pages, but pagination handles it.
      // If not on page 1, user might want to go to page 1 to see their post.
      if (currentPage !== 1) setCurrentPage(1); // Or just refresh current page: fetchPosts(currentPage)
    } catch (err) {
      console.error("Error creating post:", err);
      setCreatePostError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="feed-page-container">
      <header className="feed-header">
        <h1>Global Feed</h1>
        <p>See what fellow travelers are sharing!</p>
      </header>

      {isAuthenticated && (
        <section className="create-post-section">
          <h3>Share Your Thoughts</h3>
          <form onSubmit={handleCreatePost} className="create-post-form">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder={`What's on your mind, ${user?.username || 'traveler'}? (Max 280 chars)`}
              rows="3"
              maxLength="280"
              disabled={isSubmitting}
            />
            {createPostError && <p className="error-message post-error">{createPostError}</p>}
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Create Post'}
            </button>
          </form>
        </section>
      )}

      <section className="posts-list-section">
        <h2>Recent Posts</h2>
        {loadingPosts && <p>Loading posts...</p>}
        {postError && <p className="error-message">{postError}</p>}
        {!loadingPosts && !postError && posts.length === 0 && (
          <p>No posts yet. Be the first to share something!</p>
        )}
        {!loadingPosts && !postError && posts.length > 0 && (
          <div className="posts-list">
            {posts.map(post => (
              <div key={post._id} className="social-post-card">
                <div className="post-author-info">
                  <img
                    src={post.userId?.profilePictureUrl || '/Images/default-profile.png'}
                    alt={post.userId?.username || 'User'}
                    className="post-author-avatar"
                  />
                  <Link to={`/profile/${post.userId?._id}`} className="post-author-username">
                    {post.userId?.username || 'Unknown User'}
                  </Link>
                </div>
                <p className="post-text">{post.text}</p>
                <small className="post-timestamp">{formatDate(post.createdAt)}</small>
                {/* TODO: Add edit/delete for post owner later */}
              </div>
            ))}
          </div>
        )}
        {/* Pagination Controls */}
        {!loadingPosts && totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default FeedPage;
