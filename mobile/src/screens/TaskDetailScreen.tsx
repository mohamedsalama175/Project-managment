import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const TaskDetailScreen: React.FC<{ taskId: string; onBack: () => void }> = ({ taskId, onBack }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back to Tasks</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.label}>Task ID: {taskId}</Text>
        <Text style={styles.title}>Enterprise Security Audit Prep</Text>
        <Text style={styles.description}>
          Verify SOC 2 CC6/CC7 access controls and export cryptographic audit chain logs for auditor validation.
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>High Priority</Text>
          </View>
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeText}>In Progress</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#131b2e', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
  label: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  description: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 16 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#312e81', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeSuccess: { backgroundColor: '#064e3b' },
  badgeText: { color: '#e0e7ff', fontSize: 12, fontWeight: '600' },
});
