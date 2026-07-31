
import React, { useRef, useState } from 'react';
import { useAuth } from '../../App';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/login.css';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const emailRef = useRef();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await resetPassword(emailRef.current.value);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to reset password: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ToastContainer />
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <div>
          <label>Email</label>
          <input type='email' ref={emailRef} required />
        </div>
        <button disabled={loading} type='submit'>
          Reset Password
        </button>
      </form>
    </motion.div>
  );
};

export default ForgotPassword;
