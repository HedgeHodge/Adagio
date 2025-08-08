
import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { List, Checkbox, TextInput, Button } from 'react-native-paper';
import { useTimer } from '../../hooks/useTimer';

const TaskList = () => {
  const { activeSession, addTask, toggleTask, deleteTask } = useTimer();
  const [newTaskText, setNewTaskText] = useState('');

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      addTask(newTaskText.trim());
      setNewTaskText('');
    }
  };

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          style={{ flex: 1, marginRight: 10 }}
          label="New Task"
          value={newTaskText}
          onChangeText={setNewTaskText}
        />
        <Button mode="contained" onPress={handleAddTask}>Add</Button>
      </View>
      <FlatList
        data={activeSession?.tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.text}
            left={props => (
              <Checkbox
                {...props}
                status={item.completed ? 'checked' : 'unchecked'}
                onPress={() => toggleTask(item.id)}
              />
            )}
            right={props => (
              <Button {...props} icon="delete" onPress={() => deleteTask(item.id)} />
            )}
          />
        )}
      />
    </View>
  );
};

export default TaskList;
