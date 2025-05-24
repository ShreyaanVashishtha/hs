import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game Data
const players = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank"];
const stations = ["Central", "Admiralty", "Tsim Sha Tsui", "Mong Kok", "Prince Edward", "Sham Shui Po", "Wan Chai", "Star Ferry"];
const mtrGraph = {
  "Central": ["Admiralty", "Star Ferry"],
  "Admiralty": ["Central", "Wan Chai"],
  "Wan Chai": ["Admiralty", "Tsim Sha Tsui"],
  "Tsim Sha Tsui": ["Wan Chai", "Mong Kok"],
  "Mong Kok": ["Tsim Sha Tsui", "Prince Edward"],
  "Prince Edward": ["Mong Kok", "Sham Shui Po"],
  "Sham Shui Po": ["Prince Edward"],
  "Star Ferry": ["Central"]
};
const challengesPool = [
  "Sing a Cantonese nursery rhyme",
  "Spell 'Hong Kong' backwards",
  "Do 10 jumping jacks in public",
  "Say a station fact out loud",
  "Translate 'Hello' into Cantonese",
  "Name 3 MTR stations in 10 seconds"
];

function App() {
  const [teamAssignments, setTeamAssignments] = useState({});
  const [playerLocations, setPlayerLocations] = useState({});
  const [coins, setCoins] = useState(0);
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "state"), (docSnap) => {
      const data = docSnap.data();
      setTeamAssignments(data.teams || {});
      setPlayerLocations(data.locations || {});
      setCoins(data.coins || 0);
      setChallenges(data.challenges || []);
    });
    return () => unsub();
  }, []);

  const assignTeams = async () => {
    const seekers1 = players.slice(0, 3);
    const seekers2 = players.slice(3, 6);
    const startingLocations = Object.fromEntries(players.map(p => [p, "Central"]));
    const data = {
      teams: { seekers1, seekers2, hiders: [] },
      coins: 0,
      questions: [],
      locations: startingLocations,
      challenges: []
    };
    await setDoc(doc(db, "game", "state"), data);
  };

  const movePlayer = async (player, destination) => {
    const current = playerLocations[player];
    if (!mtrGraph[current]?.includes(destination)) {
      alert("Invalid move.");
      return;
    }

    const newLocations = { ...playerLocations, [player]: destination };
    const newChallenge = challengesPool[Math.floor(Math.random() * challengesPool.length)];
    const newChallenges = [...challenges, {
      player,
      station: destination,
      challenge: newChallenge,
      completed: false
    }];

    await setDoc(doc(db, "game", "state"), {
      teams: teamAssignments,
      coins,
      questions: [],
      locations: newLocations,
      challenges: newChallenges
    });
  };

  const toggleChallengeComplete = async (index) => {
    const updatedChallenges = [...challenges];
    updatedChallenges[index].completed = !updatedChallenges[index].completed;
    await setDoc(doc(db, "game", "state"), {
      teams: teamAssignments,
      coins,
      questions: [],
      locations: playerLocations,
      challenges: updatedChallenges
    });
  };

  return (
    <main className="p-4 sm:p-6 max-w-3xl mx-auto text-sm sm:text-base">
      <h1 className="text-2xl font-bold mb-4">HK Hide-and-Seek Game</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mb-4" onClick={assignTeams}>
        Assign Teams
      </button>
      <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">{JSON.stringify(teamAssignments, null, 2)}</pre>
      <div className="my-4 space-y-4">
        {players.map(p => {
          const role =
            (teamAssignments.seekers1?.includes(p) || teamAssignments.seekers2?.includes(p))
              ? "Seeker" : "Hider";
          return (
            <div key={p} className="border rounded p-2">
              <strong>{p}</strong> ({role}) at {playerLocations[p] || "Unknown"}
              <div className="flex flex-wrap gap-2 mt-1">
                {(mtrGraph[playerLocations[p]] || []).map(dest => (
                  <button key={dest} className="bg-gray-200 px-2 py-1 rounded" onClick={() => movePlayer(p, dest)}>{dest}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="text-lg font-semibold mt-4">Challenges:</h3>
      <ul className="list-disc pl-5 text-sm">
        {challenges.map((c, i) => (
          <li key={i} className="flex justify-between items-center">
            <span>{c.player} at {c.station}: {c.challenge}</span>
            <button className={`text-xs px-2 py-1 rounded ${c.completed ? 'bg-green-200' : 'bg-yellow-200'}`}
              onClick={() => toggleChallengeComplete(i)}>
              {c.completed ? "✓ Done" : "Mark Done"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
