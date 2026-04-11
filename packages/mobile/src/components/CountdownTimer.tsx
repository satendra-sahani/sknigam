import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { getNextDeadline } from '../utils/helpers';

const CountdownTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const nextDeadline = getNextDeadline();
    setDeadline(nextDeadline);

    if (nextDeadline) {
      updateCountdown(nextDeadline);
      intervalRef.current = setInterval(() => {
        updateCountdown(nextDeadline);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const updateCountdown = (target: Date) => {
    const now = new Date();
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeLeft(null);
      // Recalculate next deadline
      const next = getNextDeadline();
      setDeadline(next);
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    setTimeLeft({ hours, minutes, seconds });
  };

  const isUrgent =
    timeLeft && timeLeft.hours === 0 && timeLeft.minutes < 30;

  if (!deadline || !timeLeft) {
    return (
      <View style={styles.container}>
        <Icon name="clock-check-outline" size={24} color={COLORS.success} />
        <Text style={styles.doneText}>All slots completed for today</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, isUrgent && styles.urgentContainer]}>
      <View style={styles.header}>
        <Icon
          name="clock-alert-outline"
          size={20}
          color={isUrgent ? COLORS.danger : COLORS.primary}
        />
        <Text
          style={[
            styles.label,
            isUrgent && styles.urgentLabel,
          ]}>
          Next Submission Deadline
        </Text>
      </View>
      <View style={styles.timerRow}>
        <View style={styles.timeBlock}>
          <Text
            style={[
              styles.timeNumber,
              isUrgent && styles.urgentNumber,
            ]}>
            {String(timeLeft.hours).padStart(2, '0')}
          </Text>
          <Text style={styles.timeUnit}>HRS</Text>
        </View>
        <Text
          style={[
            styles.separator,
            isUrgent && styles.urgentNumber,
          ]}>
          :
        </Text>
        <View style={styles.timeBlock}>
          <Text
            style={[
              styles.timeNumber,
              isUrgent && styles.urgentNumber,
            ]}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </Text>
          <Text style={styles.timeUnit}>MIN</Text>
        </View>
        <Text
          style={[
            styles.separator,
            isUrgent && styles.urgentNumber,
          ]}>
          :
        </Text>
        <View style={styles.timeBlock}>
          <Text
            style={[
              styles.timeNumber,
              isUrgent && styles.urgentNumber,
            ]}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </Text>
          <Text style={styles.timeUnit}>SEC</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.blue50,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  urgentContainer: {
    backgroundColor: COLORS.dangerLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgentLabel: {
    color: COLORS.danger,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 52,
  },
  timeNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  urgentNumber: {
    color: COLORS.danger,
  },
  timeUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.grey500,
    letterSpacing: 1,
    marginTop: 2,
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 14,
  },
  doneText: {
    fontSize: 15,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CountdownTimer;
