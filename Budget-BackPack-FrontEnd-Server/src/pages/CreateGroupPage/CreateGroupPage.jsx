// src/pages/CreateGroupPage/CreateGroupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './CreateGroupPage.css'; // We'll create this CSS file next

const CreateGroupPage = () => {
  const { token } = useAuth(); // To ensure user is authenticated for API calls
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    coverImageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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

    try {
      const response = await axios.post('/api/groups', formData);
      setLoading(false);
      navigate(`/groups/${response.data._id}`); // Redirect to the new group's page
    } catch (err) {
      setLoading(false);
      console.error("Error creating group:", err.response);
      if (err.response && err.response.data) {
        const resData = err.response.data;
        if (resData.errors && Array.isArray(resData.errors)) {
          let newFieldErrors = {};
          let generalErrorAccumulator = '';
          resData.errors.forEach(er => {
            if (er.field && formData.hasOwnProperty(er.field)) {
              newFieldErrors[er.field] = er.msg;
            } else if (er.msg) {
              // Specific error message for unique name constraint
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
          setError('Failed to create group. An unknown error occurred.');
        }
      } else {
        setError('Failed to create group. Please check your connection.');
      }
    }
  };

  if (!token) { // Should be handled by PrivateRoute, but as a safeguard
      navigate('/login');
      return <p>Please log in to create a group.</p>;
  }

  return (
    <div className="create-group-container container">
      <h2>Create a New Travel Group</h2>
      <p>Start a community for your travel interests or specific trips!</p>

      <form onSubmit={handleSubmit} className="create-group-form">
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
            type="text" // Using text type for URL input
            id="coverImageUrl"
            name="coverImageUrl"
            value={formData.coverImageUrl}
            onChange={handleChange}
            placeholder="e.g., https://example.com/image.png"
          />
           {formData.coverImageUrl && (
            <img src={formData.coverImageUrl}
                 alt="Cover preview"
                 className="image-preview-small"
                 onError={(e) => { e.target.style.display='none'; }} // Hide if URL is invalid
                 onLoad={(e) => { e.target.style.display='block'; }} // Show if URL is valid
                 />
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
          <small className="form-text text-muted">
            Public groups are visible to everyone. Private groups may require invitations (feature coming soon).
          </small>
        </div>

        <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading}>
          {loading ? 'Creating Group...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
};

export default CreateGroupPage;
