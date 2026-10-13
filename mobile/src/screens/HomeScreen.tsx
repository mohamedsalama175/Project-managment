import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';

export const HomeScreen: React.FC<{ onSelectTask: (taskId: string) => void }> = ({ onSelectTask }) => {
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Security Audit Prep', project: 'Enterprise Onboarding', status: 'In Progress', pct: 80 },
    { id: '2', name: 'Configure SCIM Connector', project: 'Identity Migration', status: 'Review', pct: 95 },
    { id: '3', name: 'APNs Push Credentials', project: 'Mobile App Launch', status: 'Completed', pct: 100 },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DeliverOps</Text>
        <Text style={styles.subtitle}>Today's Critical Deliverables</Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskCard} onPress={() => onSelectTask(item.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.taskName}>{item.name}</Text>
              <Text style={styles.pctText}>{item.pct}%</Text>
            </View>
            <Text style={styles.projectName}>{item.project}</Text>
            <View style={styles.statusBar}>
              <View style={[styles.progressFill, { width: `${item.pct}%` }]} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  taskCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskName: { fontSize: 16, fontWeight: '600', color: '#f8fafc', flex: 1 },
  pctText: { fontSize: 13, fontWeight: 'bold', color: '#818cf8' },
  projectName: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 },
  statusBar: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366f1' },
});
