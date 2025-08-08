

import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

interface TimerDisplayProps {
  time: string;
}

const TimerDisplay = ({ time }: TimerDisplayProps) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="displayLarge">{time}</Text>
    </View>
  );
};

export default TimerDisplay;

