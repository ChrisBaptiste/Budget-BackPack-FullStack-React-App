// src/pages/EditGroupPage/EditGroupPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './EditGroupPage.css'; // We'll create this CSS file next

const EditGroupPage = () => {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    coverImageUrl: '',
  });
  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchGroupData = useCallback(async () => {
    setPageLoading(true);
    try {
      const response = await axios.get(`/api/groups/${groupId}`);
      const groupData = response.data;

      if (user?.id !== groupData.creator?._id) {
        setError('You are not authorized to edit this group.');
        navigate(`/groups/${groupId}`); // Redirect if not creator
        return;
      }

      setFormData({
        name: groupData.name || '',
        description: groupData.description || '',
        isPublic: groupData.isPublic !== undefined ? groupData.isPublic : true,
        coverImageUrl: groupData.coverImageUrl || '',
      });
      setOriginalName(groupData.name || '');
    } catch (err) {
      console.error("Error fetching group data for edit:", err);
      setError('Failed to load group data. The group may not exist.');
      if (err.response?.status === 404) navigate('/404');
    } finally {
      setPageLoading(false);
    }
  }, [groupId, user, navigate]);

  useEffect(() => {
    if (!token) { // Ensure user is logged in
        navigate('/login');
        return;
    }
    fetchGroupData();
  }, [token, fetchGroupData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!formData.name.trim()) {
      setFieldErrors({ name: 'Group name is required.' });
      return;
    }
    setLoading(true);

    const payload = { ...formData };
    // If name hasn't changed, don't send it to avoid potential unique check issues if backend isn't smart
    if (payload.name === originalName) {
        delete payload.name;
    }


    try {
      await axios.put(`/api/groups/${groupId}`, payload);
      setLoading(false);
      navigate(`/groups/${groupId}`); // Redirect to the group's page
    } catch (err) {
      setLoading(false);
      console.error("Error updating group:", err.response);
      if (err.response && err.response.data) {
        const resData = err.response.data;
        if (resData.errors && Array.isArray(resData.errors)) {
          let newFieldErrors = {};
          let generalErrorAccumulator = '';
          resData.errors.forEach(er => {
            if (er.field && formData.hasOwnProperty(er.field)) {
              newFieldErrors[er.field] = er.msg;
            } else if (er.msg) {
              if (er.msg.toLowerCase().includes('group with this name already exists')) {
                newFieldErrors.name = er.msg;
              } else {
                generalErrorAccumulator += (generalErrorAccumulator ? '; ' : '') + er.msg;
              }
            }
          });
          setFieldErrors(newFieldErrors);
           if(generalErrorAccumulator) setError(generalErrorAccumulator);
        } else if (resData.msg) {
          setError(resData.msg);
        } else {
          setError('Failed to update group. An unknown error occurred.');
        }
      } else {
        setError('Failed to update group. Please check your connection.');
      }
    }
  };

  if (pageLoading) return <div className="container text-center"><p>Loading group data for editing...</p></div>;
  // Error during page load (e.g. not creator, group not found) might be handled by redirect or message.
  if (error && !pageLoading && (!formData.name && !originalName)) { // Show error prominently if form can't load
     return <div className="container text-center error-message"><p>{error}</p></div>;
  }


  return (
    <div className="edit-group-container container">
      <h2>Edit Group: {originalName}</h2>
      <form onSubmit={handleSubmit} className="edit-group-form">
        {error && <p className="form-error-message general-error">{error}</p>}

        <div className="form-group">
          <label htmlFor="name">Group Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength="100"
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && <p id="name-error" className="form-error-message">{fieldErrors.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional, Max 500 characters)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            maxLength="500"
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="coverImageUrl">Cover Image URL (Optional)</label>
          <input
            type="text"
            id="coverImageUrl"
            name="coverImageUrl"
            value={formData.coverImageUrl}
            onChange={handleChange}
            placeholder="e.g., https://example.com/image.png"
          />
          {formData.coverImageUrl && (
            <img src={formData.coverImageUrl} alt="Cover preview" className="image-preview-small"
                 onError={(e) => { e.target.style.display='none'; }}
                 onLoad={(e) => { e.target.style.display='block'; }}/>
          )}
        </div>

        <div className="form-group form-group-checkbox">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
          />
          <label htmlFor="isPublic" className="checkbox-label">
            Make this group public
          </label>
        </div>

        <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || pageLoading}>
            {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <Link to={`/groups/${groupId}`} className="btn btn-secondary-outline" style={{marginLeft: '10px'}}>
                Cancel
            </Link>
        </div>
      </form>
    </div>
  );
};

export default EditGroupPage;
