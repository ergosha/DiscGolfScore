// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [holeCount, setHoleCount] = useState('');
  const [parPerHole, setParPerHole] = useState([]);
  const [holeNumber, setHoleNumber] = useState(1);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [viewingGames, setViewingGames] = useState(false);
  const [savedGames, setSavedGames] = useState([]);
  const [holeTimes, setHoleTimes] = useState([]);
  const [gameSaved, setGameSaved] = useState(false);

  const addPlayer = () => {
    if (playerNameInput.trim() === '') return;
    setPlayers(prev => [...prev, playerNameInput.trim()]);
    setPlayerNameInput('');
  };

  const startGame = () => {
    const emptyScores = {};
    players.forEach(name => {
      emptyScores[name] = Array(parseInt(holeCount)).fill('');
    });
    setScores(emptyScores);
    setParPerHole(Array(parseInt(holeCount)).fill(''));
    setHoleTimes(Array(parseInt(holeCount)).fill({ start: null, end: null }));
    setStarted(true);
    setStartTime(new Date());
    setHoleNumber(1);
    setGameFinished(false);
    setEndTime(null);
    setGameSaved(false);
  };

  const updateScore = (player, value) => {
    const newScores = { ...scores };
    newScores[player][holeNumber - 1] = value;
    setScores(newScores);
  };

  const updatePar = (value) => {
    const newPars = [...parPerHole];
    newPars[holeNumber - 1] = value;
    setParPerHole(newPars);

    const newTimes = [...holeTimes];
    newTimes[holeNumber - 1] = { start: new Date(), end: null };
    setHoleTimes(newTimes);
  };

  const deleteGame = async (indexToDelete) => {
    try {
      const updatedGames = savedGames.filter((_, idx) => idx !== indexToDelete);
      await AsyncStorage.setItem('discGolfGames', JSON.stringify(updatedGames));
      setSavedGames(updatedGames);
      Alert.alert('Game deleted');
    } catch (e) {
      Alert.alert('Error deleting game', e.message);
    }
  };

  const saveGameToStorage = async () => {
    if (gameSaved) {
      Alert.alert('Game already saved');
      return;
    }

    try {
      const summary = players.map(player => {
        const total = scores[player].reduce((sum, val) => sum + parseInt(val || '0'), 0);
        const parTotal = parPerHole.reduce((sum, val) => sum + parseInt(val || '0'), 0);
        const difference = total - parTotal;
        return { player, total, difference };
      });

      const holeData = holeTimes.map((time, index) => {
        const duration =
          time?.start && time?.end
            ? `${Math.round((new Date(time.end) - new Date(time.start)) / 1000)}s`
            : 'N/A';
        return {
          hole: index + 1,
          par: parPerHole[index],
          duration,
        };
      });

      const game = {
        date: new Date().toISOString(),
        players,
        parPerHole,
        scores,
        startTime,
        endTime,
        summary,
        holeTimes: holeData,
      };

      const prev = await AsyncStorage.getItem('discGolfGames');
      const allGames = prev ? JSON.parse(prev) : [];
      allGames.unshift(game); // Uusin peli ylimmäksi
      await AsyncStorage.setItem('discGolfGames', JSON.stringify(allGames));
      setGameSaved(true);
      Alert.alert('Game saved!');
    } catch (error) {
      Alert.alert('Saving failed', error.message);
    }
  };

  useEffect(() => {
    if (!started || gameFinished) return;
    const allFilled = players.every(player => scores[player][holeNumber - 1] !== '');
    if (allFilled) {
      const updatedTimes = [...holeTimes];
      updatedTimes[holeNumber - 1].end = new Date();
      setHoleTimes(updatedTimes);

      if (holeNumber === parseInt(holeCount)) {
        setEndTime(new Date());
        setGameFinished(true);
      } else {
        setHoleNumber(prev => prev + 1);
      }
    }
  }, [scores]);

  useEffect(() => {
    if (viewingGames) {
      (async () => {
        try {
          const data = await AsyncStorage.getItem('discGolfGames');
          setSavedGames(data ? JSON.parse(data) : []);
        } catch (e) {
          Alert.alert('Error loading saved games', e.message);
        }
      })();
    }
  }, [viewingGames]);

  const getElapsedTime = () => {
    if (startTime && endTime) {
      const diffMs = endTime - startTime;
      const minutes = Math.floor(diffMs / 60000);
      const seconds = ((diffMs % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
    return null;
  };

  if (viewingGames) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Saved Games</Text>
        {savedGames.length === 0 ? (
          <Text>No saved games found.</Text>
        ) : (
          savedGames.map((game, index) => (
            <View key={index} style={{ marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>{new Date(game.date).toLocaleString()}</Text>
              {game.summary.map((entry, idx) => (
                <Text key={idx}>
                  {entry.player}: {entry.total} throws ({entry.difference >= 0 ? '+' : ''}{entry.difference} vs PAR)
                </Text>
              ))}
              <Text>Duration: {Math.floor((new Date(game.endTime) - new Date(game.startTime)) / 60000)} minutes</Text>
              {game.holeTimes && game.holeTimes.map((hole, i) => (
                <Text key={i}>
                  Hole {hole.hole}: PAR {hole.par}, Duration: {hole.duration}
                </Text>
              ))}
              <Button
                title="Delete"
                color="#d9534f"
                onPress={() =>
                  Alert.alert(
                    'Delete Game',
                    'Are you sure you want to delete this game?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteGame(index) },
                    ]
                  )
                }
              />
            </View>
          ))
        )}
        <Button title="Back to Home" onPress={() => setViewingGames(false)} />
      </ScrollView>
    );
  }

  if (gameFinished) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Game Summary</Text>
        {players.map(player => {
          const total = scores[player].reduce((sum, val) => sum + parseInt(val || '0'), 0);
          const parTotal = parPerHole.reduce((sum, val) => sum + parseInt(val || '0'), 0);
          const difference = total - parTotal;
          return (
            <Text key={player} style={styles.summaryText}>
              {player}: {total} throws ({difference >= 0 ? '+' : ''}{difference} vs PAR)
            </Text>
          );
        })}
        <Text style={styles.timerText}>Total Time: {getElapsedTime()}</Text>
        {holeTimes.map((t, i) => (
          <Text key={i}>Hole {i + 1}: PAR {parPerHole[i]}, Duration: {t.start && t.end ? `${Math.round((new Date(t.end) - new Date(t.start)) / 1000)}s` : 'N/A'}</Text>
        ))}
        <Button title="Save Game" onPress={saveGameToStorage} disabled={gameSaved} />
        <View style={{ marginTop: 20 }}>
          <Button title="Back to Home" onPress={() => {
            setStarted(false);
            setPlayers([]);
            setScores({});
            setParPerHole([]);
            setHoleCount('');
            setHoleNumber(1);
            setGameFinished(false);
            setStartTime(null);
            setEndTime(null);
            setHoleTimes([]);
            setGameSaved(false);
          }} />
        </View>
      </ScrollView>
    );
  }

  if (!started) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Disc Golf Scorecard</Text>

        <TextInput
          style={styles.input}
          placeholder="Number of Holes"
          keyboardType="numeric"
          value={holeCount}
          onChangeText={text => setHoleCount(text)}
        />

        <View style={styles.addPlayerContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add Player Name"
            value={playerNameInput}
            onChangeText={setPlayerNameInput}
          />
          <Button title="Add" onPress={addPlayer} />
        </View>

        {players.map((player, index) => (
          <Text key={index} style={styles.playerName}>{player}</Text>
        ))}

        {holeCount && players.length > 0 && (
          <Button title="Start Game" onPress={startGame} />
        )}

        <View style={{ marginTop: 20 }}>
          <Button title="View Saved Games" onPress={() => setViewingGames(true)} />
        </View>
      </ScrollView>
    );
  }

  if (!parPerHole[holeNumber - 1]) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Set PAR for Hole {holeNumber}</Text>
        <TextInput
          style={styles.input}
          placeholder={`PAR for hole ${holeNumber}`}
          keyboardType="numeric"
          value={parPerHole[holeNumber - 1] || ''}
          onChangeText={updatePar}
        />
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Set the par before continuing</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Hole {holeNumber} / {holeCount}</Text>
      <Text style={styles.parText}>PAR: {parPerHole[holeNumber - 1]}</Text>
      {players.map(player => (
        <TextInput
          key={player}
          style={styles.input}
          placeholder={`${player}'s throw`}
          keyboardType="numeric"
          value={scores[player][holeNumber - 1]}
          onChangeText={(value) => updateScore(player, value)}
        />
      ))}
      <Text style={{ textAlign: 'center', marginTop: 20 }}>Waiting for all players to input...</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  addPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  playerName: {
    fontSize: 18,
    marginVertical: 5,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
  },
  parText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    color: '#555',
  },
});
// This code is a React Native application that serves as a disc golf scorecard.
// It allows users to add players, set the number of holes, input scores, and save game data.
// The app uses AsyncStorage to persist game data and provides a summary of the game after completion.
// The UI is built using React Native components and styles, providing a simple and intuitive interface for users to track their disc golf games.
// The app also includes functionality to view previously saved games, displaying player scores and game duration.
// The code is structured to handle different states of the game, including starting a new game, entering scores, and viewing saved games.
// The use of hooks like useState and useEffect allows for managing state and side effects in a functional component style.
// The app is designed to be user-friendly, with clear prompts and feedback for actions like adding players, starting games, and saving results.
// The styles are defined using StyleSheet.create for better performance and organization.
// The app is a complete solution for tracking disc golf scores, making it easy for players to focus on their game without worrying about manual scorekeeping.
// The code is modular and can be easily extended with additional features, such as more detailed statistics or integration with external APIs for disc golf courses.
// The app is a great tool for disc golf enthusiasts, providing a digital scorecard that enhances the playing experience.




