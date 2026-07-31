const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const branches = [
  "Banaswadii",
  "Kammanahallii",
  "Agara Horamavu",
  "Lingrajpuram",
  "Thanisandra",
  "Babusapalya",
  "TC Palya",
  "HBR LAYOUT",
  "Horamavu"
];

const requestedBy = "KmklaX0TPQWchA32SVogfVmATT53"; // your userId
const status = "Approved";
const type = "dailyReadings";

function pad(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

async function insertPastDateRequests() {
  const year = 2025;
  const month = "09"; // September

  for (let day = 1; day <= 7; day++) {
    const formattedDate = `${year}-${month}-${pad(day)} 05:30:00`;

    for (const branch of branches) {
      const docData = {
        requestedBranch: branch,
        requestedBy,
        requestedDate: formattedDate,
        status,
        type
      };

      await db.collection("pastDateRequests").add(docData);
      console.log(`Inserted: ${branch} → ${formattedDate}`);
    }
  }
}

insertPastDateRequests()
  .then(() => console.log("✅ All documents inserted into pastDateRequests"))
  .catch(err => console.error("❌ Error inserting documents:", err));
