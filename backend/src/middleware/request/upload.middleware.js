const multer = require("multer");

// Standard multer memory storage (buffers are passed to services or cloud/local disk)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB per file
    files: 5,
  },
});

const uploadSingle = (fieldName = "file") => upload.single(fieldName);
const uploadMultiple = (fieldName = "files", maxCount = 5) => upload.array(fieldName, maxCount);

// Optional file upload middleware that won't fail if request is application/json
const optionalUpload = (fieldName = "files", maxCount = 5) => {
  return (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      return upload.array(fieldName, maxCount)(req, res, next);
    }
    next();
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  optionalUpload,
};
