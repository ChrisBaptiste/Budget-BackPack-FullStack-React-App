// src/pages/ProfilePage/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css'; // We'll create this CSS file next

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [postsError, setPostsError] = useState('');
  const [userGroups, setUserGroups] = useState([]); // State for user's groups
  const [loadingGroups, setLoadingGroups] = useState(true); // Loading state for groups
  const [groupsError, setGroupsError] = useState(''); // Error state for groups

  const [currentPostsPage, setCurrentPostsPage] = useState(1);
  const [totalPostsPages, setTotalPostsPages] = useState(1);
  // Add pagination for groups if necessary, for now fetching first few
  // const [currentGroupsPage, setCurrentGroupsPage] = useState(1);
  // const [totalGroupsPages, setTotalGroupsPages] = useState(1);


  const isOwner = isAuthenticated && currentUser?.id === userId;

  // Fetch profile data
  useEffect(() => {
    setLoadingProfile(true);
    setProfileError('');
    axios.get(`/api/auth/users/${userId}/profile`) // Using the new public profile endpoint
      .then(response => {
        setProfileData(response.data);
      })
      .catch(err => {
        console.error("Error fetching profile data:", err);
        setProfileError(err.response?.data?.msg || 'Failed to load profile. User may not exist.');
        if (err.response?.status === 404) navigate('/404'); // Or a more specific not found page
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [userId, navigate]);

  // Fetch user's posts
  const fetchUserPosts = useCallback(async (page = 1) => {
    setLoadingPosts(true);
    setPostsError('');
    try {
      const response = await axios.get(`/api/posts/user/${userId}?page=${page}&limit=5`);
      setUserPosts(response.data.posts);
      setCurrentPostsPage(response.data.currentPage);
      setTotalPostsPages(response.data.totalPages);
    } catch (err) {
      console.error("Error fetching user posts:", err);
      setPostsError('Failed to load posts for this user.');
    } finally {
      setLoadingPosts(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
        fetchUserPosts(currentPostsPage);
    }
  }, [userId, fetchUserPosts, currentPostsPage]);

  // Fetch user's created groups
  useEffect(() => {
    if (userId) {
      setLoadingGroups(true);
      setGroupsError('');
      axios.get(`/api/groups/user/${userId}?limit=5`) // Fetch first 5 groups for profile display
        .then(response => {
          setUserGroups(response.data.groups);
        })
        .catch(err => {
          console.error("Error fetching user's groups:", err);
          setGroupsError("Failed to load user's groups.");
        })
        .finally(() => {
          setLoadingGroups(false);
        });
    }
  }, [userId]);

  const handlePostsPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPostsPages) {
      setCurrentPostsPage(newPage);
    }
  };

  const formatDate = (dateString, includeTime = false) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleString(undefined, options);
  };

  if (loadingProfile) {
    return <div className="container text-center"><p>Loading profile...</p></div>;
  }

  if (profileError) {
    return <div className="container text-center error-message"><p>{profileError}</p></div>;
  }

  if (!profileData) {
    // This case should ideally be handled by the error state or redirect
    return <div className="container text-center"><p>No profile data found.</p></div>;
  }

  return (
    <div className="profile-page-container">
      <header className="profile-header-section">
        <div className="profile-banner">
          {/* Banner image could go here if we add one later */}
        </div>
        <div className="profile-info-main">
          <img
            src={profileData.profilePictureUrl || '/Images/default-profile.png'}
            alt={`${profileData.username}'s profile`}
            className="profile-picture-large"
          />
          <div className="profile-details">
            <h1>{profileData.username}</h1>
            <p className="profile-member-since">Member since: {formatDate(profileData.memberSince)}</p>
            {isOwner && (
              <Link to="/profile/edit" className="btn btn-secondary edit-profile-btn">
                Edit Profile
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="profile-content-section">
        <div className="profile-bio-section card-style">
          <h3>Bio</h3>
          {profileData.bio ? <p>{profileData.bio}</p> : <p>No bio provided yet.</p>}
        </div>

        <div className="profile-preferences-section card-style">
          <h3>Travel Preferences</h3>
          {profileData.travelPreferences && profileData.travelPreferences.length > 0 ? (
            <ul className="preferences-list">
              {profileData.travelPreferences.map((pref, index) => (
                <li key={index} className="preference-tag">{pref}</li>
              ))}
            </ul>
          ) : (
            <p>No travel preferences listed yet.</p>
          )}
        </div>
      </section>

      <section className="profile-user-activity-section">
        <div className="profile-posts-section card-style">
          <h2>{isOwner ? "My Posts" : `${profileData.username}'s Posts`}</h2>
          {loadingPosts && <p>Loading posts...</p>}
        {postsError && <p className="error-message">{postsError}</p>}
        {!loadingPosts && !postsError && userPosts.length === 0 && (
          <p>{isOwner ? "You haven't made any posts yet." : "This user hasn't made any posts yet."}</p>
        )}
        {!loadingPosts && !postsError && userPosts.length > 0 && (
          <div className="posts-list">
            {userPosts.map(post => (
              <div key={post._id} className="social-post-card">
                {/* Minimal author info as we are on their profile */}
                <p className="post-text">{post.text}</p>
                <small className="post-timestamp">{formatDate(post.createdAt, true)}</small>
                 {/* TODO: Add edit/delete for post owner later, if on own profile */}
              </div>
            ))}
          </div>
        )}
        {/* Pagination for User Posts */}
          {!loadingPosts && totalPostsPages > 1 && (
            <div className="pagination-controls">
              <button onClick={() => handlePostsPageChange(currentPostsPage - 1)} disabled={currentPostsPage === 1}>
                Previous
              </button>
              <span>Page {currentPostsPage} of {totalPostsPages}</span>
              <button onClick={() => handlePostsPageChange(currentPostsPage + 1)} disabled={currentPostsPage === totalPostsPages}>
                Next
              </button>
            </div>
          )}
        </div>

        <div className="profile-groups-section card-style">
          <h2>{isOwner ? "My Created Groups" : `${profileData.username}'s Created Groups`}</h2>
          {loadingGroups && <p>Loading groups...</p>}
          {groupsError && <p className="error-message">{groupsError}</p>}
          {!loadingGroups && !groupsError && userGroups.length === 0 && (
            <p>{isOwner ? "You haven't created any groups yet." : "This user hasn't created any groups yet."}</p>
          )}
          {!loadingGroups && !groupsError && userGroups.length > 0 && (
            <ul className="compact-list">
              {userGroups.map(group => (
                <li key={group._id} className="compact-list-item">
                  <Link to={`/groups/${group._id}`}>
                    <img
                        src={group.coverImageUrl || '/Images/default-group-cover.png'}
                        alt={group.name}
                        className="compact-item-image"
                    />
                    <span>{group.name}</span>
                  </Link>
                   <span className="item-meta">({group.members?.length || 0} members)</span>
                </li>
              ))}
            </ul>
          )}
          {/* Can add a link to a page showing ALL user's groups if more than 5 */}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
