// src/pages/GroupsListPage/GroupsListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './GroupsListPage.css'; // We'll create this CSS file next

const GroupsListPage = () => {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGroups = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/groups?page=${page}&limit=9`); // Fetch 9 for 3x3 grid
      setGroups(response.data.groups);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError('Failed to load groups. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups(currentPage);
  }, [fetchGroups, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="groups-list-page-container container">
      <header className="groups-list-header">
        <h1>Explore Travel Groups</h1>
        <p>Find communities of travelers, share experiences, and plan together.</p>
        {isAuthenticated && (
          <Link to="/groups/new" className="btn btn-primary create-group-btn-header">
            + Create New Group
          </Link>
        )}
      </header>

      {loading && <p className="text-center">Loading groups...</p>}
      {error && <p className="error-message text-center">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-center">No groups found. Why not create the first one?</p>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="groups-grid">
          {groups.map(group => (
            <div key={group._id} className="group-card">
              <Link to={`/groups/${group._id}`} className="group-card-link">
                <div className="group-card-image-container">
                  <img
                    src={group.coverImageUrl || '/Images/default-group-cover.png'}
                    alt={`${group.name} cover`}
                    className="group-card-image"
                    onError={(e) => { e.target.onerror = null; e.target.src='/Images/default-group-cover.png'; }}
                  />
                </div>
                <div className="group-card-content">
                  <h3>{group.name}</h3>
                  <p className="group-card-creator">
                    Created by: {group.creator?.username || 'Unknown'}
                  </p>
                  <p className="group-card-members">
                    {group.members?.length || 0} member(s)
                  </p>
                   <span className={`group-card-privacy ${group.isPublic ? 'public' : 'private'}`}>
                    {group.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
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
    </div>
  );
};

export default GroupsListPage;
