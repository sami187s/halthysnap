import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY   = '#00591d';
const BG        = '#f8faf8';
const SURFACE   = '#ffffff';
const ON_BG     = '#191c1b';
const ON_VAR    = '#40493e';
const OUTLINE   = '#707a6d';
const OUTLINE_V = '#bfc9bb';
const ERROR     = '#ba1a1a';
const SECONDARY = '#556158';

const SectionHeader = ({ icon, title, accentColor = PRIMARY }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionAccent, { backgroundColor: accentColor }]} />
    <Ionicons name={icon} size={20} color={PRIMARY} style={{ marginRight: 8 }} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export default function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const openURL = async (url) => {
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {}
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={ON_BG} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data & Sources</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. About ── */}
        <View style={styles.section}>
          <Text style={styles.aboutHeadline}>
            <Ionicons name="information-circle" size={26} color={PRIMARY} />{'  '}
            About Vee
          </Text>
          <Text style={styles.aboutBody}>
            I'm Sami, the founder of VEE and a first-year nutrition student.{'\n\n'}
            I built VEE for myself and for anyone who wants to better understand what they're
            putting into their body. Whether it's checking ingredients, nutrition, or learning
            more about everyday products, VEE is designed to make health information simple,
            clear, and accessible.{'\n\n'}
            My goal is to help people make more informed choices about their health through
            easy-to-understand, reliable information. If you enjoy using VEE, I'd really
            appreciate it if you could leave a rating or review on the App Store. Your support
            helps more people discover VEE and motivates me to keep making it better.
          </Text>
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => openURL('https://apps.apple.com/us/app/vee-product-check/id6751061358')}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={18} color="#fff" />
            <Text style={styles.rateBtnText}>Rate VEE on the App Store</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ── 2. Our Sources ── */}
        <View style={styles.section}>
          <SectionHeader icon="albums-outline" title="Our Sources" />

          {/* Open Food Facts */}
          <View style={styles.sourceCard}>
            <View style={styles.sourceCardTop}>
              <Text style={styles.sourceCardName}>Open Food Facts</Text>
              <Text style={styles.sourcePrimary}>PRIMARY</Text>
            </View>
            <Text style={styles.sourceCardDesc}>
              A collaborative database of food products from around the world.
              We utilize their live API for real-time ingredient analysis.
            </Text>
            <TouchableOpacity
              style={styles.sourceLink}
              onPress={() => openURL('https://world.openfoodfacts.org')}
            >
              <Text style={styles.sourceLinkText}>Visit Database</Text>
              <Ionicons name="open-outline" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Open Beauty Facts */}
          <View style={[styles.sourceCard, { marginTop: 12 }]}>
            <View style={styles.sourceCardTop}>
              <Text style={styles.sourceCardName}>Open Beauty Facts</Text>
              <Text style={styles.sourcePrimary}>COSMETICS</Text>
            </View>
            <Text style={styles.sourceCardDesc}>
              Open database of cosmetic products with full ingredient compositions
              and safety assessments.
            </Text>
            <TouchableOpacity
              style={styles.sourceLink}
              onPress={() => openURL('https://world.openbeautyfacts.org')}
            >
              <Text style={styles.sourceLinkText}>Visit Database</Text>
              <Ionicons name="open-outline" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* SnapEngine bar chart */}
          <View style={[styles.sourceCard, { marginTop: 12 }]}>
            <Text style={styles.sourceCardName}>The SnapEngine™</Text>
            <Text style={[styles.sourceCardDesc, { marginBottom: 16 }]}>
              Our proprietary algorithm cross-references scanned data against
              12 nutritional benchmarks.
            </Text>
            <View style={styles.barChartRow}>
              <View style={styles.barChartBars}>
                {[
                  { label: 'PRO', h: 32 },
                  { label: 'VIT', h: 48 },
                  { label: 'FIB', h: 40 },
                  { label: 'SUG', h: 16, muted: true },
                  { label: 'SAT', h: 24, muted: true },
                  { label: 'SOD', h: 20, muted: true },
                ].map((b) => (
                  <View key={b.label} style={styles.barItem}>
                    <View style={[styles.bar, { height: b.h, backgroundColor: b.muted ? OUTLINE_V : PRIMARY }]} />
                    <Text style={styles.barLabel}>{b.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.barChartStatus}>
                <Text style={styles.barChartStatusLabel}>STATUS</Text>
                <Text style={styles.barChartStatusValue}>Optimized</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── 3. How Scoring Works ── */}
        <View style={styles.section}>
          <SectionHeader icon="analytics-outline" title="How Scoring Works" />

          <View style={styles.scoreCenterCard}>
            <Text style={styles.scoreIndexLabel}>Vee Index</Text>
            <Text style={styles.scoreBig}>0–100</Text>
            <Text style={styles.scoreIndexSub}>A unified nutritional quality score</Text>
          </View>

          <View style={[styles.bentoCard, { marginTop: 12 }]}>
            {[
              { label: 'Optimal',  range: '70–100', color: PRIMARY },
              { label: 'Moderate', range: '40–69',  color: SECONDARY },
              { label: 'Avoid',    range: '0–39',   color: ERROR },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.scoreRow}>
                  <View style={[styles.scoreDot, { backgroundColor: item.color }]} />
                  <Text style={styles.scoreRowLabel}>{item.label}</Text>
                  <Text style={[styles.scoreRowRange, { color: item.color }]}>{item.range}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── 4. Data Limitations ── */}
        <View style={styles.section}>
          <SectionHeader icon="warning-outline" title="Data Limitations" accentColor={OUTLINE} />
          <View style={styles.limitationCard}>
            <View style={styles.limitationInner}>
              <Ionicons name="shield-checkmark-outline" size={24} color={OUTLINE} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.limitationTitle}>Verified Intelligence</Text>
                <Text style={styles.limitationBody}>
                  While we strive for 100% accuracy, users should verify critical information
                  directly on physical packaging. Vee is a nutritional guidance tool,
                  not a medical device.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── CTA Card ── */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Still have questions?</Text>
          <Text style={styles.ctaBody}>
            Our team is here to help you navigate your nutritional journey.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => openURL('mailto:samis2005s18@gmail.com')}
            activeOpacity={0.88}
          >
            <Text style={styles.ctaBtnText}>Contact Our Support Team</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Vee</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => openURL('https://sites.google.com/view/vee-privacy-policy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopy}>© 2025 Vee. All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: OUTLINE_V,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f2f4f2',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: ON_BG },

  content: { paddingHorizontal: 20, paddingTop: 28, gap: 0 },

  section: { marginBottom: 40 },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionAccent: { width: 4, height: 32, borderRadius: 4, marginRight: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: ON_BG, letterSpacing: -0.3 },

  divider: {
    height: 1,
    marginBottom: 40,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: OUTLINE_V,
    opacity: 0.4,
  },

  /* About */
  aboutHeadline: {
    fontSize: 26, fontWeight: '800', color: ON_BG,
    letterSpacing: -0.5, marginBottom: 14,
  },
  aboutBody: {
    fontSize: 15, color: ON_VAR, lineHeight: 24,
  },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: PRIMARY, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20, marginTop: 20,
  },
  rateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  /* Source cards */
  sourceCard: {
    backgroundColor: SURFACE, borderRadius: 16,
    padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: OUTLINE_V,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 2,
  },
  sourceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sourceCardName: { fontSize: 17, fontWeight: '700', color: ON_BG },
  sourcePrimary: { fontSize: 10, fontWeight: '800', color: PRIMARY, letterSpacing: 1.5 },
  sourceCardDesc: { fontSize: 14, color: ON_VAR, lineHeight: 21 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  sourceLinkText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  /* Bar chart */
  barChartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barChartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barItem: { alignItems: 'center', gap: 4 },
  bar: { width: 8, borderRadius: 4 },
  barLabel: { fontSize: 8, fontWeight: '700', color: OUTLINE, textTransform: 'uppercase' },
  barChartStatus: { alignItems: 'flex-end' },
  barChartStatusLabel: { fontSize: 9, fontWeight: '700', color: OUTLINE, letterSpacing: 1, textTransform: 'uppercase' },
  barChartStatusValue: { fontSize: 15, fontWeight: '800', color: PRIMARY },

  /* Score section */
  scoreCenterCard: {
    backgroundColor: '#f2f4f2',
    borderRadius: 16, paddingVertical: 24,
    alignItems: 'center',
  },
  scoreIndexLabel: { fontSize: 11, fontWeight: '700', color: OUTLINE, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  scoreBig: { fontSize: 48, fontWeight: '800', color: PRIMARY, letterSpacing: -2, lineHeight: 52 },
  scoreIndexSub: { fontSize: 13, color: ON_VAR, marginTop: 6 },

  bentoCard: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: OUTLINE_V,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 2,
  },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 12,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreRowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: ON_BG },
  scoreRowRange: { fontSize: 20, fontWeight: '700' },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#f2f4f2', marginHorizontal: 20 },

  /* Limitation */
  limitationCard: {
    borderRadius: 16, padding: 18,
    backgroundColor: '#f2f4f2',
    borderLeftWidth: 4, borderLeftColor: OUTLINE,
  },
  limitationInner: { flexDirection: 'row', alignItems: 'flex-start' },
  limitationTitle: { fontSize: 16, fontWeight: '700', color: ON_BG, marginBottom: 6 },
  limitationBody: { fontSize: 14, color: ON_VAR, lineHeight: 21 },

  /* CTA */
  ctaCard: {
    backgroundColor: PRIMARY, borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 40,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 6,
  },
  ctaTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  ctaBody: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: '#fff', borderRadius: 99,
    paddingVertical: 14, paddingHorizontal: 28, width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: PRIMARY },

  /* Footer */
  footer: { alignItems: 'center', gap: 12, paddingVertical: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: OUTLINE_V },
  footerBrand: { fontSize: 20, fontWeight: '700', color: PRIMARY },
  footerLinks: { flexDirection: 'row', gap: 32 },
  footerLink: { fontSize: 14, color: ON_VAR, textDecorationLine: 'underline' },
  footerCopy: { fontSize: 12, color: OUTLINE, opacity: 0.8 },
});
