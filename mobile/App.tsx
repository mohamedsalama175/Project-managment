import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';

export default function App() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      {selectedTaskId ? (
        <TaskDetailScreen taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />
      ) : (
        <HomeScreen onSelectTask={(id) => setSelectedTaskId(id)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090d16',
  },
});
