



import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import TimerDisplay from '../components/timer/TimerDisplay';
import TimerControls from '../components/timer/TimerControls';
import TaskList from '../components/timer/TaskList';
import { useTimer } from '../hooks/useTimer';
import { getMotivationalQuote, MotivationalQuoteOutput } from '../ai/flows/motivational-quote-flow';

const HomeScreen = () => {
  const { activeSession, startTimer, pauseTimer, resetTimer, formatTime } = useTimer();
  const [quote, setQuote] = useState<MotivationalQuoteOutput | null>(null);

  const handleGetQuote = async () => {
    const newQuote = await getMotivationalQuote();
    setQuote(newQuote);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <TimerDisplay time={formatTime(activeSession?.currentTime ?? 0)} />
      <TimerControls 
        onStart={startTimer} 
        onPause={pauseTimer} 
        onReset={resetTimer} 
        isRunning={activeSession?.isRunning ?? false} 
      />
      <TaskList />
      <Button mode="contained" onPress={handleGetQuote} style={{ marginTop: 20 }}>
        Get Quote
      </Button>
      {quote && (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text variant="bodyLarge">{quote.quote}</Text>
          <Text variant="bodyMedium" style={{ marginTop: 5 }}>- {quote.source}</Text>
        </View>
      )}
    </View>
  );
};

export default HomeScreen;



