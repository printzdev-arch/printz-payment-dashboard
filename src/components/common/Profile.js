
import React, { useState, useEffect } from 'react';
import { db, storage } from '../../services/authservice';
import { useAuth } from '../../App';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { FaUser } from 'react-icons/fa'; // Importing FaUser instead of FaHome
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/profile.css';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Profile = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(''); // Assuming username is part of the user data
  const [originalData, setOriginalData] = useState({}); // Store original profile data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branch: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser) {
        const docRef = doc(db, `users/${currentUser.uid}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data.role);
          setUsername(data.name);
          setFormData(data);         // This will now include profilePicUrl if it exists
          setOriginalData(data);
        } else {
          console.log('No such document!');
        }
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
      const docRef = doc(db, `users/${currentUser.uid}`);
      await updateDoc(docRef, formData);
      setLoading(false);
      toast.success('Profile updated successfully');
      setIsEditing(false); // Switch back to view mode
    } catch (error) {
      setError('Failed to update profile');
      console.error('Error updating document: ', error);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Revert back to original data and switch to view mode
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    try {
      const storageRef = ref(
        storage,
        userRole === "admin"
          ? `admin/${username}/profile_pic`
          : `${formData.branch}/profile_pic`
      );
  
      // Upload
      const uploadTask = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
  
      // Update Firestore with the profilePicUrl
      const docRef = doc(db, `users/${currentUser.uid}`);
      await updateDoc(docRef, {
        profilePicUrl: downloadUrl,
      });
  
      // Update local state
      setFormData((prevData) => ({
        ...prevData,
        profilePicUrl: downloadUrl,
      }));
  
      toast.success("Profile picture uploaded successfully!");
  
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Delay to allow toast to show
  
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture.");
    }
  };
  
  

  return (
    <div className="profile-container">
      <ToastContainer />
      <div className="profile-picture-wrapper">
  <label
    htmlFor="profile-upload"
    className="profile-picture"
    style={{ cursor: isEditing ? "pointer" : "default" }}
  >
    {formData.profilePicUrl ? (
      <img src={formData.profilePicUrl} alt="Profile" />
    ) : (
      <div className="profile-placeholder">+ Add Image</div>
    )}

    {/* Hidden file input */}
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
</div>


      <div className="profile-header">
        <FaUser size={30} className="profile-icon" /> {/* Replacing FaHome with FaUser */}
        <h2>Profile</h2>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required disabled={!isEditing} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled />
          </div>
          <div>
            <label>Phone Number</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} required disabled={!isEditing} />
          </div>
          {/* <div>
            <label>Branch Name</label>
            <input type="text" name="branch" value={formData.branch} onChange={handleChange} required disabled={!isEditing} />
          </div> */}
          {isEditing ? (
            <div className="button-group">
              <button className='this' type="submit" disabled={loading}>Save</button>
              <button className='this' type="button" onClick={handleCancel}>Cancel</button>
            </div>
          ) : (
            <button className='this' type="button" onClick={handleEdit}>Edit</button>
          )}
        </form>
      )}
    </div>
  );
};

export default Profile;
