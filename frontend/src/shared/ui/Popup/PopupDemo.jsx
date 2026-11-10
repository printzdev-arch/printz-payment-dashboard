import React from 'react';
import Popup from './Popup.jsx';
import { usePopup } from '../../hooks/usePopup';
import '../../styles/popupDemo.css';

const PopupDemo = () => {
  const { popup, showSuccess, showError, showInfo, hidePopup } = usePopup();

  const handleShowSuccess = () => {
    showSuccess(
      "Your operation was completed successfully! All data has been saved and the inventory has been updated accordingly.",
      "Operation Successful"
    );
  };

  const handleShowError = () => {
    showError(
      "An error occurred while processing your request. Please check your input data and try again. If the problem persists, contact support.",
      "Operation Failed",
      false // Don't auto-close errors
    );
  };

  const handleShowInfo = () => {
    showInfo(
      "This is an informational message to let you know about important updates or changes to the system.",
      "System Information"
    );
  };

  const handleShowCustomContent = () => {
    const customContent = (
      <div>
        <p><strong>Custom Content Example:</strong></p>
        <ul>
          <li>✅ Feature A enabled</li>
          <li>⚠️ Feature B has warnings</li>
          <li>❌ Feature C is disabled</li>
        </ul>
        <p>You can pass any React component as content!</p>
      </div>
    );

    showInfo(customContent, "Custom Content Demo");
  };

  const handleShowLongContent = () => {
    const longContent = `
      This is a demonstration of how the popup handles longer content. 
      The popup will automatically add scrollbars when the content exceeds the maximum height.
      
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      
      Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
      totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
    `;

    showInfo(longContent, "Long Content Demo");
  };

  return (
    <div className="popup-demo-container">
      <div className="popup-demo-header">
        <h1>Popup Component Demo</h1>
        <p>Test the different types of popup notifications</p>
      </div>

      <div className="popup-demo-grid">
        <div className="demo-section">
          <h3>Basic Popup Types</h3>
          <div className="demo-buttons">
            <button 
              className="demo-btn success-btn"
              onClick={handleShowSuccess}
            >
              Show Success Popup
            </button>
            
            <button 
              className="demo-btn error-btn"
              onClick={handleShowError}
            >
              Show Error Popup
            </button>
            
            <button 
              className="demo-btn info-btn"
              onClick={handleShowInfo}
            >
              Show Info Popup
            </button>
          </div>
        </div>
      </div>

      {/* Popup Component */}
      <Popup {...popup} />
    </div>
  );
};

export default PopupDemo;
