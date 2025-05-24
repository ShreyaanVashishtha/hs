import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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

export default function GameApp() {
  const [teamAssignments, setTeamAssignments] = useState({});
  const [playerLocations, setPlayerLocations] = useState({});
  const [view, setView] = useState("admin");
  const [coins, setCoins] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [challengeFilter, setChallengeFilter] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "state"), (docSnap) => {
      const data = docSnap.data();
      setTeamAssignments(data.teams);
      setCoins(data.coins);
      setQuestions(data.questions);
      setPlayerLocations(data.locations || {});
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
      alert("Invalid move. Not directly connected.");
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
      questions,
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
      questions,
      locations: playerLocations,
      challenges: updatedChallenges
    });
  };

  const filteredChallenges = challenges.filter(c => {
    if (challengeFilter === "done") return c.completed;
    if (challengeFilter === "notdone") return !c.completed;
    return true;
  });

  const Interface = () => {
    if (view === "admin") {
      return (
        <Card className="p-4">
          <CardContent>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <Button onClick={assignTeams} className="my-2">Assign Teams</Button>
            <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
              {JSON.stringify(teamAssignments, null, 2)}
            </pre>
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
                        <Button key={dest} onClick={() => movePlayer(p, dest)}>{dest}</Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <h3 className="text-lg font-semibold mt-4">Challenges:</h3>
            <div className="flex gap-2 mb-2">
              <Button variant={challengeFilter === "all" ? "default" : "outline"} onClick={() => setChallengeFilter("all")}>All</Button>
              <Button variant={challengeFilter === "done" ? "default" : "outline"} onClick={() => setChallengeFilter("done")}>Done</Button>
              <Button variant={challengeFilter === "notdone" ? "default" : "outline"} onClick={() => setChallengeFilter("notdone")}>Not Done</Button>
            </div>
            <ul className="list-disc pl-5 text-sm">
              {filteredChallenges.map((c, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{c.player} at {c.station}: {c.challenge}</span>
                  <Button size="sm" variant={c.completed ? "secondary" : "outline"}
                    onClick={() => toggleChallengeComplete(i)}>
                    {c.completed ? "✓ Done" : "Mark Done"}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <main className="p-4 sm:p-6 max-w-3xl mx-auto text-sm sm:text-base">
      <h1 className="text-2xl font-bold mb-4">Hong Kong Hide and Seek Strategy Game</h1>
      <Interface />
    </main>
  );
}

