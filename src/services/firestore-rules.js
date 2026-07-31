// Firestore Security Rules
// Copy and paste these rules into your Firebase Console -> Firestore Database -> Rules

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Printers collection - authenticated users can read/write
    match /printers/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Printer readings collection - authenticated users can read/write
    match /printerReadings/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Jumbo xerox readings collection - authenticated users can read/write
    match /jumboXeroxReadings/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Total amount readings collection - authenticated users can read/write
    match /totalAmountReadings/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Stock readings collection - authenticated users can read/write
    match /stockReadings/{document} {
      allow read, write: if request.auth != null;
    }
    
    // JumboXerox configuration collection - authenticated users can read/write
    match /JumboXerox/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Past date requests collection - authenticated users can read/write
    match /pastDateRequests/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Payment to be collected collection - authenticated users can read/write
    match /paymentToBeCollected/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow all authenticated users to read and write to all collections
    // This is a broad rule - you may want to make it more restrictive based on your needs
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`

console.log("Firestore Security Rules:")
console.log(firestoreRules)

// Instructions for applying these rules:
console.log("\n=== INSTRUCTIONS ===")
console.log("1. Go to Firebase Console (https://console.firebase.google.com)")
console.log("2. Select your project")
console.log("3. Go to Firestore Database")
console.log("4. Click on 'Rules' tab")
console.log("5. Replace the existing rules with the rules shown above")
console.log("6. Click 'Publish' to apply the new rules")
console.log("\nThese rules allow all authenticated users to read and write to all collections.")
console.log("You may want to make them more restrictive based on your security requirements.")
console.log("\nIMPORTANT: Make sure to add the 'paymentToBeCollected' collection rule as shown above.")
