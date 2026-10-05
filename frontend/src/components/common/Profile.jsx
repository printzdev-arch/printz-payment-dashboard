import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { FaUser, FaCamera, FaEnvelope, FaPhone, FaBuilding, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState('');
  const [originalData, setOriginalData] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branch: '',
    profilePicUrl: '',
  });

  const getUserId = () => {
    return currentUser?.id || currentUser?._id || currentUser?.uid || formData?._id || formData?.id;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/auth/me");
        const data = res.data?.data || res.data?.user || res.data;
        if (data) {
          setUserRole(data.role);
          setUsername(data.name);
          setFormData(data);
          setOriginalData(data);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const data = JSON.parse(storedUser);
          setUserRole(data.role);
          setUsername(data.name);
          setFormData(data);
          setOriginalData(data);
        } else {
          setError("Failed to load user profile");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const uid = getUserId();
      await api.put(`/users/${uid}`, formData);
      
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userObj = { ...JSON.parse(storedUser), ...formData };
        localStorage.setItem("user", JSON.stringify(userObj));
      }

      setLoading(false);
      toast.success('Profile updated successfully');
      setOriginalData(formData);
      setIsEditing(false);
    } catch (error) {
      setError('Failed to update profile');
      console.error('Error updating profile: ', error);
      toast.error('Failed to update profile: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result;
        const uid = getUserId();
        await api.put(`/users/${uid}`, { profilePicUrl: base64Url });

        setFormData((prevData) => ({
          ...prevData,
          profilePicUrl: base64Url,
        }));
        setOriginalData((prev) => ({
          ...prev,
          profilePicUrl: base64Url,
        }));

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userObj = { ...JSON.parse(storedUser), profilePicUrl: base64Url };
          localStorage.setItem("user", JSON.stringify(userObj));
        }

        toast.success("Profile picture updated successfully!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture.");
    }
  };

  const isNameBig = (formData.name || username || "").length > 18;

  return (
    <div className="profile-page-wrapper">
      <ToastContainer />

      {error && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            zIndex: 10,
            padding: "10px 16px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="revenue-loading-box" style={{ maxWidth: "420px", width: "100%", margin: "0 auto" }}>
          <div className="revenue-loading-spinner"></div>
          <p>Loading user profile...</p>
        </div>
      ) : (
        <div className="profile-modern-card">
          {/* Left: Identity Panel */}
          <div className="profile-identity-panel">
            <label
              htmlFor={isEditing ? "profile-upload" : undefined}
              className="profile-avatar-wrapper"
              style={{ cursor: isEditing ? "pointer" : "default" }}
            >
              {formData.profilePicUrl ? (
                <img
                  src={formData.profilePicUrl}
                  alt="Profile"
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <FaUser size={34} color="#94a3b8" />
                  <span>No Photo</span>
                </div>
              )}

              {isEditing && (
                <div className="profile-avatar-upload-overlay">
                  <FaCamera size={11} />
                  <span>Change</span>
                </div>
              )}

              {isEditing && (
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                  style={{ display: "none" }}
                />
              )}
            </label>

            <h3 className="profile-user-name">
              {formData.name || username || "User"}
            </h3>

            {userRole && (
              <span className={`profile-role-badge ${userRole === "admin" ? "admin" : "manager"}`}>
                {userRole}
              </span>
            )}

            {formData.email && (
              <p className="profile-user-email-preview" title={formData.email}>
                {formData.email}
              </p>
            )}
          </div>

          {/* Right: Form Details Panel */}
          <form onSubmit={handleSubmit} className="profile-form-panel">
            <div className="profile-form-grid">
              {/* Full Name */}
              <div className={`profile-field-group ${isNameBig ? "profile-field-full-width" : ""}`}>
                    <label className="profile-field-label">Full Name</label>
                    <div className="profile-input-wrapper">
                      <FaUser className="profile-input-icon" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ""}
                        onChange={handleChange}
                        required
                        disabled={!isEditing}
                        className={`profile-input ${isEditing ? "editable" : ""}`}
                        placeholder="Enter full name"
                        title={formData.name || ""}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className={`profile-field-group ${isNameBig ? "profile-field-full-width" : ""}`}>
                    <label className="profile-field-label">Phone Number</label>
                    <div className="profile-input-wrapper">
                      <FaPhone className="profile-input-icon" />
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        required
                        disabled={!isEditing}
                        className={`profile-input ${isEditing ? "editable" : ""}`}
                        placeholder="Enter phone number"
                        title={formData.phone || ""}
                      />
                    </div>
                  </div>

              {/* Email Address - Full width so long emails are never clipped */}
              <div className="profile-field-group profile-field-full-width">
                <label className="profile-field-label">Email Address</label>
                <div className="profile-input-wrapper">
                  <FaEnvelope className="profile-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    required
                    disabled
                    className="profile-input"
                    placeholder="Email address"
                    title={formData.email || ""}
                  />
                </div>
              </div>

              {/* Branch or Role Info - Full width */}
              {formData.branch ? (
                <div className="profile-field-group profile-field-full-width">
                  <label className="profile-field-label">Branch</label>
                  <div className="profile-input-wrapper">
                    <FaBuilding className="profile-input-icon" />
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      disabled
                      className="profile-input"
                      placeholder="Assigned branch"
                      title={formData.branch}
                    />
                  </div>
                </div>
              ) : (
                <div className="profile-field-group profile-field-full-width">
                  <label className="profile-field-label">Department / Access</label>
                  <div className="profile-input-wrapper">
                    <FaBuilding className="profile-input-icon" />
                    <input
                      type="text"
                      value="System Administration"
                      disabled
                      className="profile-input"
                      title="System Administration"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions Row */}
            <div className="profile-actions-row">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="profile-btn-secondary"
                  >
                    <FaTimes /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="profile-btn-primary"
                  >
                    <FaSave /> {loading ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="profile-btn-primary"
                >
                  <FaEdit /> Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
