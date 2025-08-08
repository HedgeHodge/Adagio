
import React from 'react';
import { View, FlatList } from 'react-native';
import { List, Text } from 'react-native-paper';
import { useTimer } from '../hooks/useTimer';

const LogScreen = () => {
  const { log } = useTimer();

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={log}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.project}
            description={`${item.duration} minutes`}
            left={props => <List.Icon {...props} icon="history" />}
          />
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No sessions logged yet.</Text>}
      />
    </View>
  );
};

export default LogScreen;
