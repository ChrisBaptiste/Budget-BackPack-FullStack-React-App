// src/pages/EditProfilePage/EditProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './EditProfilePage.css'; // We'll create this CSS file next

const EditProfilePage = () => {
  const { user, setUser: updateUserContext, token } = useAuth(); // setUser is our updateUserContext
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    bio: '',
    profilePictureUrl: '',
    travelPreferences: [],
  });
  const [preferencesInput, setPreferencesInput] = useState(''); // For comma-separated input
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        bio: user.bio || '',
        profilePictureUrl: user.profilePictureUrl || '',
        travelPreferences: user.travelPreferences || [],
      });
      setPreferencesInput((user.travelPreferences || []).join(', '));
    } else {
      // If user data isn't loaded yet (e.g. direct navigation before context is ready)
      // consider fetching /api/auth/me here or relying on PrivateRoute to redirect if not auth.
      // For now, assuming user object in context is populated for an authenticated route.
    }
  }, [user]);

  const handlePreferencesInputChange = (e) => {
    setPreferencesInput(e.target.value);
    // Update formData.travelPreferences on the fly or on submit
    setFormData(prevData => ({
      ...prevData,
      travelPreferences: e.target.value.split(',').map(pref => pref.trim()).filter(pref => pref),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    // Prepare payload, ensure travelPreferences is an array of strings
    const payload = {
      ...formData,
      travelPreferences: preferencesInput.split(',').map(pref => pref.trim()).filter(pref => pref),
    };
    // Remove profilePictureUrl if it's empty and was previously the default, to avoid saving empty string over default
    if (payload.profilePictureUrl === '' && user?.profilePictureUrl === '/Images/default-profile.png') {
        // If user clears the field, and it was the default, let backend reset to default if it wishes, or send current default.
        // Or, to be explicit that user wants default:
        // payload.profilePictureUrl = '/Images/default-profile.png';
        // For now, sending empty string allows user to clear it, backend model has default.
    }


    try {
      const response = await axios.put('/api/auth/profile', payload);
      updateUserContext(response.data); // Update user in AuthContext with new data from backend
      setLoading(false);
      navigate(`/profile/${user.id}`); // Redirect to their profile page
    } catch (err) {
      setLoading(false);
      console.error("Error updating profile:", err.response);
      if (err.response && err.response.data) {
        const resData = err.response.data;
        if (resData.errors && Array.isArray(resData.errors)) {
          let newFieldErrors = {};
          let generalErrorAccumulator = '';
          resData.errors.forEach(er => {
            if (er.field && formData.hasOwnProperty(er.field)) {
              newFieldErrors[er.field] = er.msg;
            } else {
              generalErrorAccumulator += (generalErrorAccumulator ? '; ' : '') + er.msg;
            }
          });
          setFieldErrors(newFieldErrors);
          if(generalErrorAccumulator) setError(generalErrorAccumulator);
        } else if (resData.msg) {
          setError(resData.msg);
        } else {
          setError('Failed to update profile. An unknown error occurred.');
        }
      } else {
        setError('Failed to update profile. Please check your connection.');
      }
    }
  };

  if (!user && !token) { // If no token, means not logged in, PrivateRoute should handle.
    // This check is mostly a safeguard if somehow accessed without PrivateRoute.
    navigate('/login');
    return <p>Please log in to edit your profile.</p>;
  }

  if (!user && token) { // Token exists, but user data not yet loaded in context
      return <div className="container text-center"><p>Loading profile data...</p></div>;
  }


  return (
    <div className="edit-profile-container container">
      <h2>Edit Your Profile</h2>
      <form onSubmit={handleSubmit} className="profile-edit-form">
        {error && <p className="form-error-message general-error">{error}</p>}

        <div className="form-group">
          <label htmlFor="profilePictureUrl">Profile Picture URL</label>
          <input
            type="text"
            id="profilePictureUrl"
            name="profilePictureUrl"
            value={formData.profilePictureUrl}
            onChange={handleChange}
            placeholder="e.g., https://example.com/image.png or /Images/my-pic.png"
          />
          {fieldErrors.profilePictureUrl && <p className="form-error-message">{fieldErrors.profilePictureUrl}</p>}
           {formData.profilePictureUrl && (
            <img src={formData.profilePictureUrl.startsWith('http') || formData.profilePictureUrl.startsWith('/') ? formData.profilePictureUrl : '/Images/default-profile.png'}
                 alt="Profile preview"
                 className="profile-preview-small"
                 onError={(e) => { e.target.onerror = null; e.target.src='/Images/default-profile.png'; }} />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio (Max 250 characters)</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="4"
            maxLength="250"
          ></textarea>
          {fieldErrors.bio && <p className="form-error-message">{fieldErrors.bio}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="travelPreferences">Travel Preferences (comma-separated)</label>
          <input
            type="text"
            id="travelPreferences"
            name="travelPreferences"
            value={preferencesInput}
            onChange={handlePreferencesInputChange}
            placeholder="e.g., Budget Travel, Solo Adventures, Cultural Tourism"
          />
           {fieldErrors.travelPreferences && <p className="form-error-message">{fieldErrors.travelPreferences}</p>}
          <div className="preferences-preview">
            {formData.travelPreferences.map((pref, index) => (
              <span key={index} className="preference-tag-edit">{pref}</span>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
