

import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';

interface TimerControlsProps {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
}

const TimerControls = ({ onStart, onPause, onReset, isRunning }: TimerControlsProps) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', padding: 20 }}>
      {isRunning ? (
        <Button mode="contained" onPress={onPause}>Pause</Button>
      ) : (
        <Button mode="contained" onPress={onStart}>Start</Button>
      )}
      <Button mode="contained" onPress={onReset}>Reset</Button>
    </View>
  );
};

export default TimerControls;

