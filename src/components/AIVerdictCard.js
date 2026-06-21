import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * AIVerdictCard — "What This Means For You"
 *
 * Replaces the old AI Summary InsightCard. Uses conversational AI text,
 * highlights watch-outs and positives inline, and embeds the "Ask AI" CTA.
 *
 * Props:
 *  - summary       : string   — 2-3 sentence AI verdict (conversational tone)
 *  - concerns      : string[] — watch-out items (e.g. "Sodium", "Sat. Fat")
 *  - positives     : string[] — positive items (e.g. "Source of Potassium")
 *  - onAskAI       : function — opens chat modal
 *  - score         : number   — health score (used to decide if we show card)
 */
const AIVerdictCard = ({ summary, concerns = [], positives = [], onAskAI, score }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [displayedText, setDisplayedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Typewriter effect for AI text
  useEffect(() => {
    if (!summary) {
      setTypingComplete(true);
      return;
    }
    setDisplayedText('');
    setTypingComplete(false);
    let i = 0;
    const words = summary.split(' ');
    const interval = setInterval(() => {
      if (i < words.length) {
        setDisplayedText(prev => (prev ? prev + ' ' + words[i] : words[i]));
        i++;
      } else {
        clearInterval(interval);
        setTypingComplete(true);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [summary]);

  if (!summary && concerns.length === 0 && positives.length === 0) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>✦ AI Verdict</Text>
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles" size={18} color="#7B61FF" />
        </View>
      </View>

      {/* AI Summary Text — conversational, typewriter effect */}
      {summary ? (
        <Text style={styles.summaryText}>
          {displayedText}
          {!typingComplete && <Text style={styles.cursor}>|</Text>}
        </Text>
      ) : null}

      {/* Watch out for / Positives inline tags */}
      <View style={styles.tagsSection}>
        {concerns.length > 0 && (
          <View style={styles.tagRow}>
            <Text style={styles.tagLabel}>⚠ Watch out for:</Text>
            <Text style={styles.tagValues}>
              {concerns.slice(0, 4).join(' · ')}
            </Text>
          </View>
        )}
        {positives.length > 0 && (
          <View style={styles.tagRow}>
            <Text style={styles.tagLabelGood}>✓ Positives:</Text>
            <Text style={styles.tagValuesGood}>
              {positives.slice(0, 4).join(' · ')}
            </Text>
          </View>
        )}
      </View>

      {/* Inline Ask AI button */}
      {onAskAI && (
        <TouchableOpacity style={styles.askButton} onPress={onAskAI} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7B61FF" />
          <Text style={styles.askButtonText}>Ask AI a question</Text>
          <Ionicons name="arrow-forward" size={14} color="#7B61FF" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E8D8',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 15,
    color: '#3D3D3D',
    lineHeight: 22,
    marginBottom: 16,
  },
  cursor: {
    color: '#7B61FF',
    fontWeight: '300',
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F57C00',
    marginRight: 8,
    minWidth: 110,
  },
  tagValues: {
    fontSize: 13,
    color: '#3D3D3D',
    flex: 1,
  },
  tagLabelGood: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 8,
    minWidth: 110,
  },
  tagValuesGood: {
    fontSize: 13,
    color: '#3D3D3D',
    flex: 1,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 97, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.15)',
  },
  askButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B61FF',
    marginHorizontal: 8,
  },
});

export default AIVerdictCard;
