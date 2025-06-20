// src/pages/GroupDetailsPage/GroupDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './GroupDetailsPage.css'; // We'll create this CSS file next

const GroupDetailsPage = () => {
  const { groupId } = useParams();
  const { user: currentUser, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/groups/${groupId}`);
      setGroup(response.data);
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError(err.response?.data?.msg || 'Failed to load group details. Group may not exist or is private.');
      if (err.response?.status === 404) navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleJoinGroup = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/groups/${groupId}` } });
      return;
    }
    setActionInProgress(true);
    try {
      await axios.post(`/api/groups/${groupId}/join`);
      await fetchGroupDetails(); // Refresh group details to show new member
    } catch (err) {
      console.error("Error joining group:", err);
      setError(err.response?.data?.msg || 'Failed to join group.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionInProgress(true);
    try {
      await axios.post(`/api/groups/${groupId}/leave`);
      await fetchGroupDetails(); // Refresh group details
    } catch (err) {
      console.error("Error leaving group:", err);
      setError(err.response?.data?.msg || 'Failed to leave group.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
      setActionInProgress(true);
      try {
        await axios.delete(`/api/groups/${groupId}`);
        navigate('/groups'); // Redirect to groups list after deletion
      } catch (err) {
        console.error("Error deleting group:", err);
        setError(err.response?.data?.msg || 'Failed to delete group.');
        setActionInProgress(false);
      }
      // No finally here, as page will redirect on success
    }
  };

  if (loading) return <div className="container text-center"><p>Loading group details...</p></div>;
  if (error && !group) return <div className="container text-center error-message"><p>{error}</p></div>;
  if (!group) return <div className="container text-center"><p>Group not found.</p></div>;

  const isCreator = isAuthenticated && currentUser?.id === group.creator?._id;
  const isMember = isAuthenticated && group.members?.some(member => member.user?._id === currentUser?.id);

  return (
    <div className="group-details-page-container">
      <header className="group-details-header" style={{backgroundImage: `url(${group.coverImageUrl || '/Images/default-group-cover.png'})`}}>
        <div className="group-header-overlay">
          <h1>{group.name}</h1>
          <p className="group-privacy">{group.isPublic ? 'Public Group' : 'Private Group'}</p>
          <p className="group-creator">Created by:
            <Link to={`/profile/${group.creator?._id}`}>{group.creator?.username || 'Unknown'}</Link>
          </p>
        </div>
      </header>

      <div className="group-actions-bar container">
        {isCreator && (
          <>
            <Link to={`/groups/${groupId}/edit`} className="btn btn-secondary">Edit Group</Link>
            <button onClick={handleDeleteGroup} className="btn btn-danger" disabled={actionInProgress}>
              {actionInProgress ? 'Deleting...' : 'Delete Group'}
            </button>
          </>
        )}
        {isAuthenticated && !isCreator && !isMember && (
          <button onClick={handleJoinGroup} className="btn btn-primary" disabled={actionInProgress}>
            {actionInProgress ? 'Joining...' : 'Join Group'}
          </button>
        )}
        {isAuthenticated && !isCreator && isMember && (
          <button onClick={handleLeaveGroup} className="btn btn-warning" disabled={actionInProgress}>
            {actionInProgress ? 'Leaving...' : 'Leave Group'}
          </button>
        )}
      </div>
      {error && <p className="error-message text-center container">{error}</p>}


      <div className="group-content-container container">
        <section className="group-description-section card-style">
          <h3>About this Group</h3>
          <p>{group.description || 'No description provided.'}</p>
        </section>

        <section className="group-members-section card-style">
          <h3>Members ({group.members?.length || 0})</h3>
          {group.members && group.members.length > 0 ? (
            <ul className="members-list">
              {group.members.map(memberItem => (
                <li key={memberItem.user?._id || memberItem._id} className="member-item">
                  <Link to={`/profile/${memberItem.user?._id}`}>
                    <img
                      src={memberItem.user?.profilePictureUrl || '/Images/default-profile.png'}
                      alt={memberItem.user?.username}
                      className="member-avatar"
                    />
                    <span>{memberItem.user?.username || 'Unknown User'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No members yet. Be the first to join!</p>
          )}
        </section>

        {/* Placeholder for future group-specific posts or discussions */}
        {/* <section className="group-feed-section card-style">
          <h3>Group Activity</h3>
          <p>Group posts and discussions will appear here.</p>
        </section> */}
      </div>
    </div>
  );
};

export default GroupDetailsPage;
