import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AboutScreen = ({ navigation }) => {
  const openURL = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert('Unable to open this link. Please check your internet connection.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      alert('Unable to open this link at this time.');
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
        <Text style={st.headerTitle}>About</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={st.logoSection}>
          <Image
            source={require('../../assets/vee-logo.png')}
            style={st.logoImage}
            resizeMode="contain"
          />
          <Text style={st.appName}>vee</Text>
          <Text style={st.version}>Version 1.0.0</Text>
          <Text style={st.tagline}>Your personal health scanner for cosmetic products</Text>
        </View>

        {/* What We Do */}
        <View style={st.card}>
          <Text style={st.cardTitle}>What We Do</Text>
          <Text style={st.cardText}>
            Vee helps you make informed decisions about the products you use every single day. We analyze ingredients in food and personal care products so you can instantly see what's really inside — no chemistry degree needed.{`\n\n`}Scan a barcode or search for a product to get a clear health score, a full ingredient breakdown, and the knowledge to choose better.
          </Text>
        </View>

        {/* Meet the Founder */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Meet the Founder</Text>
          <View style={st.founderRow}>
            <View style={st.founderAvatar}>
              <Text style={st.founderInitial}>S</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.founderName}>Sami</Text>
              <Text style={st.founderRole}>Co-founder of Vee · Nutrition Student</Text>
            </View>
          </View>
          <Text style={[st.cardText, { marginTop: 14 }]}>
            Since I was young, I became hyper-aware of what I was putting into my body. The more I learned as a nutrition student, the more I realized how many harmful ingredients are hiding in plain sight — in the food we eat, the skincare we use, the products we trust every day.{`\n\n`}I built Vee because everyone deserves to know exactly what's in the products they use. Not buried in a tiny-print ingredient list, but clearly, instantly, and honestly.
          </Text>
        </View>

        {/* How It Works */}
        <View style={st.card}>
          <Text style={st.cardTitle}>How It Works</Text>
          <View style={{ marginTop: 16 }}>
            {[
              { n: '1', title: 'Scan or Search',       text: 'Use your camera to scan product barcodes or search by product name' },
              { n: '2', title: 'Analyze Ingredients',  text: 'Our algorithm analyzes each ingredient against our comprehensive safety database' },
              { n: '3', title: 'Get Your Score',       text: 'Receive an easy-to-understand health score from 0–100 with detailed recommendations' },
            ].map((step) => (
              <View key={step.n} style={st.step}>
                <View style={st.stepNum}>
                  <Text style={st.stepNumText}>{step.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.stepTitle}>{step.title}</Text>
                  <Text style={st.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Scoring System */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Our Scoring System</Text>
          {[
            { range: '75–100', label: 'Excellent', sub: 'Safe, beneficial ingredients',      color: '#4CAF50' },
            { range: '50–74',  label: 'Good',      sub: 'Generally safe for regular use',    color: '#8BC34A' },
            { range: '25–49',  label: 'Mediocre',  sub: 'Some concerning ingredients',       color: '#FF9800' },
            { range: '0–24',   label: 'Poor',      sub: 'Contains risky ingredients',        color: '#F44336' },
          ].map((item) => (
            <View key={item.label} style={st.scoreRow}>
              <View style={[st.scorePill, { backgroundColor: item.color }]}>
                <Text style={st.scorePillText}>{item.range}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.scoreLabel}>{item.label}</Text>
                <Text style={st.scoreSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Data Sources */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Data Sources</Text>
          <Text style={[st.cardText, { marginBottom: 12 }]}>Our ingredient analysis is powered by:</Text>

          <TouchableOpacity style={st.linkRow} onPress={() => openURL('https://world.openbeautyfacts.org')}>
            <Ionicons name="globe-outline" size={18} color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.linkTitle}>Open Beauty Facts</Text>
              <Text style={st.linkSub}>Open database of cosmetic products with ingredients and compositions</Text>
            </View>
            <Ionicons name="open-outline" size={14} color="#444" />
          </TouchableOpacity>

          <View style={[st.linkRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="library-outline" size={18} color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.linkTitle}>Comprehensive Ingredient Database</Text>
              <Text style={st.linkSub}>Curated database of cosmetic ingredients with safety assessments</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Important Notice</Text>
          <View style={st.disclaimer}>
            <Ionicons name="information-circle-outline" size={22} color="#FF9800" style={{ marginTop: 2 }} />
            <Text style={st.disclaimerText}>
              This app provides general information about cosmetic ingredients and is not intended as medical advice.
              Always consult healthcare professionals for specific concerns and perform patch tests before using new products.
            </Text>
          </View>
        </View>

        {/* Contact & Support */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Contact & Support</Text>
          <Text style={[st.cardText, { marginBottom: 14 }]}>Have questions or suggestions? We'd love to hear from you!</Text>
          <TouchableOpacity style={st.actionBtn} onPress={() => navigation.navigate('Sources')}>
            <Ionicons name="library-outline" size={18} color="#a0a0a0" />
            <Text style={st.actionBtnText}>View Data Sources</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => openURL('mailto:samis2005s18@gmail.com')}>
            <Ionicons name="mail-outline" size={18} color="#a0a0a0" />
            <Text style={st.actionBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Legal & Privacy */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Legal & Privacy</Text>
          <Text style={[st.cardText, { marginBottom: 14 }]}>Your privacy and security are important to us.</Text>

          <TouchableOpacity style={st.legalBtn} onPress={() => openURL('https://sites.google.com/view/vee-privacy-policy')}>
            <View style={st.legalIcon}><Ionicons name="shield-checkmark" size={20} color="#4CAF50" /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.legalTitle}>Privacy Policy</Text>
              <Text style={st.legalSub}>Learn how we protect your data and respect your privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={[st.legalBtn, { marginBottom: 0 }]} onPress={() => openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <View style={st.legalIcon}><Ionicons name="document-text" size={20} color="#2196F3" /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.legalTitle}>Terms of Use (EULA)</Text>
              <Text style={st.legalSub}>Read our terms and conditions for using the app</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#444" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={st.footerText}>Made with ❤️ for healthier choices</Text>
          <Text style={st.copyright}>© 2025 HealthyScan. All rights reserved.</Text>
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
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  logoImage: {
    width: 180,
    height: 130,
    marginBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  version: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(240,240,240,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 22,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 19,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  scorePill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 2,
  },
  scoreSub: {
    fontSize: 12,
    color: '#666666',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 2,
  },
  linkSub: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,152,0,0.07)',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,152,0,0.2)',
    gap: 10,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#a07020',
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
  },
  legalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 10,
  },
  legalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 2,
  },
  legalSub: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },
  footerText: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 4,
  },
  founderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  founderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  founderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  founderRole: {
    fontSize: 12,
    color: '#4CAF50',
    letterSpacing: 0.3,
  },
  copyright: {
    fontSize: 11,
    color: '#333333',
    letterSpacing: 0.5,
  },
});

export default AboutScreen;
