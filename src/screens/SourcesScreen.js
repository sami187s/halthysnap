import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SourcesScreen = ({ navigation }) => {
  const openURL = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link. Please check your internet connection.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Could not open the link at this time.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#a0a0a0" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Data Sources</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <Text style={st.intro}>
          HealthyScan combines multiple data sources to provide you with comprehensive product information and health analysis.
        </Text>

        {/* Open Food Facts */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <View style={[st.cardIcon, { backgroundColor: 'rgba(76,175,80,0.1)' }]}>
              <Ionicons name="globe-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={st.cardTitle}>Open Food Facts</Text>
          </View>
          <Text style={st.cardText}>
            Our primary database for product information, ingredients, and nutritional data. A collaborative, free, and open database of food and cosmetic products from around the world.
          </Text>
          <TouchableOpacity style={st.linkRow} onPress={() => openURL('https://world.openfoodfacts.org')}>
            <Text style={st.linkText}>Visit openfoodfacts.org</Text>
            <Ionicons name="open-outline" size={14} color="#4CAF50" />
          </TouchableOpacity>
          <View style={st.detailBlock}>
            <Text style={st.detailLabel}>API Endpoint</Text>
            <Text style={st.detailValue}>world.openfoodfacts.org/api/v0/product/</Text>
          </View>
        </View>

        {/* Analysis Engine */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <View style={[st.cardIcon, { backgroundColor: 'rgba(255,152,0,0.1)' }]}>
              <Ionicons name="analytics-outline" size={20} color="#FF9800" />
            </View>
            <Text style={st.cardTitle}>HealthyScan Analysis Engine</Text>
          </View>
          <Text style={st.cardText}>
            Our proprietary ingredient analysis system that evaluates the safety and health impact of cosmetic and personal care ingredients.
          </Text>
          <View style={st.detailBlock}>
            <Text style={st.detailLabel}>Analysis Method</Text>
            <Text style={st.detailValue}>Local ingredient database matching</Text>
            <Text style={[st.detailLabel, { marginTop: 10 }]}>Score Range</Text>
            <Text style={st.detailValue}>0–100 (Higher = Healthier)</Text>
            <Text style={[st.detailLabel, { marginTop: 10 }]}>Color Coding</Text>
            {[
              { color: '#4CAF50', label: 'Green (70–100): Healthy'  },
              { color: '#FF9800', label: 'Orange (40–69): Moderate' },
              { color: '#F44336', label: 'Red (0–39): Risky'        },
            ].map((c) => (
              <View key={c.label} style={st.colorRow}>
                <View style={[st.colorDot, { backgroundColor: c.color }]} />
                <Text style={st.colorText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Data Accuracy */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <View style={[st.cardIcon, { backgroundColor: 'rgba(33,150,243,0.1)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#2196F3" />
            </View>
            <Text style={st.cardTitle}>Data Accuracy & Limitations</Text>
          </View>
          <Text style={st.cardText}>While we strive for accuracy, please note the following limitations:</Text>
          <View style={{ marginTop: 12 }}>
            {[
              'Product data depends on community contributions and may not always be complete or up-to-date',
              'Not all products have barcode data available in our sources',
              'Health analysis is for informational purposes only and should not replace professional medical advice',
              'Regional product variations may not be reflected in the data',
            ].map((item, i) => (
              <View key={i} style={st.bulletRow}>
                <Text style={st.bullet}>•</Text>
                <Text style={st.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={st.contactText}>Have questions about our data sources or found an error?</Text>
          <TouchableOpacity style={st.contactBtn} onPress={() => openURL('mailto:samis2005s18@gmail.com')}>
            <Text style={st.contactBtnText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  header: {
    height: Platform.OS === 'ios' ? 90 : 72,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(240,240,240,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 60,
  },
  intro: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e0e0e0',
    flex: 1,
  },
  cardText: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 20,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
  },
  detailBlock: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorText: {
    fontSize: 13,
    color: '#888888',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#444444',
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#777777',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  contactBtnText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default SourcesScreen;
