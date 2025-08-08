
import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTimer } from '../hooks/useTimer';

const SettingsScreen = () => {
  const { settings, updateSettings } = useTimer();
  const [workDuration, setWorkDuration] = useState(settings.workDuration.toString());
  const [shortBreakDuration, setShortBreakDuration] = useState(settings.shortBreakDuration.toString());
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreakDuration.toString());
  const [timersPerSet, setTimersPerSet] = useState(settings.timersPerSet.toString());

  const handleSave = () => {
    updateSettings({
      workDuration: parseInt(workDuration, 10),
      shortBreakDuration: parseInt(shortBreakDuration, 10),
      longBreakDuration: parseInt(longBreakDuration, 10),
      timersPerSet: parseInt(timersPerSet, 10),
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        label="Work Duration (minutes)"
        value={workDuration}
        onChangeText={setWorkDuration}
        keyboardType="numeric"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Short Break (minutes)"
        value={shortBreakDuration}
        onChangeText={setShortBreakDuration}
        keyboardType="numeric"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Long Break (minutes)"
        value={longBreakDuration}
        onChangeText={setLongBreakDuration}
        keyboardType="numeric"
        style={{ marginBottom: 10 }}
      />
      <TextInput
        label="Timers per Set"
        value={timersPerSet}
        onChangeText={setTimersPerSet}
        keyboardType="numeric"
        style={{ marginBottom: 20 }}
      />
      <Button mode="contained" onPress={handleSave}>Save</Button>
    </View>
  );
};

export default SettingsScreen;
