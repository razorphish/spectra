import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Home() {
  const healthUrl = useMemo(() => `${API_URL}/v1/platform/stats`, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spectra Platform</Text>
      <Text style={styles.subtitle}>Expo Router • Web + Native</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>API base</Text>
        <Text style={styles.cardValue}>{API_URL}</Text>
        <Text style={styles.cardLabel}>Probe</Text>
        <Text style={styles.cardValue}>{healthUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1020',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 480,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 14,
    color: '#e5e7eb',
    fontFamily: 'Courier New',
  },
});
